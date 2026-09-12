#!/usr/bin/env bash
# Import fabric/notebooks/*.ipynb into the Fabric workspace.
#
# `fab import -i` expects an *item directory* (`<name>.Notebook/` containing
# `.platform` + `notebook-content.ipynb`), not a bare .ipynb — passing the
# .ipynb directly fails with "[InvalidInput] The request has an invalid input".
# This script builds those directories, binds the default lakehouse so the
# notebooks can resolve `Files/...` without anyone clicking through the portal,
# and imports them.
#
# Usage:  ./fabric/deploy_notebooks.sh [notebook_name ...]
#         (no args = all ten)
set -euo pipefail

WORKSPACE="Healthcare-FabCon2026-Demo"
WORKSPACE_ID="1b136d57-daff-4d47-85f6-a2cfcd405736"
LAKEHOUSE_NAME="NHS_PROMs_LH"
LAKEHOUSE_ID="039ff306-3acb-437b-8596-fc1d3dc85c96"

export PATH="$PATH:$HOME/.local/bin"
command -v fab >/dev/null || { echo "fab not on PATH. Run: pipx install ms-fabric-cli --python python3.12"; exit 1; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/fabric/notebooks"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

if [ $# -gt 0 ]; then
  NOTEBOOKS=("$@")
else
  NOTEBOOKS=(10_bronze_ingest 20_silver_clean 30_gold_features 31_data_exploration \
             40_train_register 41_model_search 42_threshold_analysis 43_explainability \
             50_batch_score 60_sync_app_db)
fi

for nb in "${NOTEBOOKS[@]}"; do
  item="$STAGE/${nb}.Notebook"
  mkdir -p "$item"

  python3 - "$SRC/${nb}.ipynb" "$item" "$nb" "$WORKSPACE_ID" "$LAKEHOUSE_ID" "$LAKEHOUSE_NAME" <<'PY'
import json, os, sys, uuid

src, item, name, ws, lh, lh_name = sys.argv[1:7]

nb = json.load(open(src))
# Bind the default lakehouse so `Files/...` and `spark.table(...)` resolve on
# first run. Without this the notebook opens unattached and every path fails.
nb["metadata"]["dependencies"] = {
    "lakehouse": {
        "default_lakehouse": lh,
        "default_lakehouse_name": lh_name,
        "default_lakehouse_workspace_id": ws,
        "known_lakehouses": [{"id": lh}],
    }
}
json.dump(nb, open(os.path.join(item, "notebook-content.ipynb"), "w"), indent=1)

json.dump({
    "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
    "metadata": {"type": "Notebook", "displayName": name},
    "config": {"version": "2.0", "logicalId": str(uuid.uuid4())},
}, open(os.path.join(item, ".platform"), "w"), indent=2)
PY

  fab import -f "${WORKSPACE}.Workspace/${nb}.Notebook" -i "$item" --format .ipynb
done

echo
echo "Imported ${#NOTEBOOKS[@]} notebook(s) into ${WORKSPACE}, bound to ${LAKEHOUSE_NAME}."
