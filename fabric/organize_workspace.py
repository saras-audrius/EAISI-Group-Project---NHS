#!/usr/bin/env python3
"""
Organise the Fabric workspace into folders that mirror the medallion pipeline.

Two Fabric CLI limitations this works around:

  * `fab ls` does not show folders, and `fab mv` refuses to move items between
    folders in the same workspace ("[NotSupported]"). Both operations do work
    through the REST API, so this script drives that directly via `fab api`.
  * `fab api -i` needs a JSON *file* path; an inline JSON string fails with
    "Expecting value: line 1 column 1".

Usage:
    python3 fabric/organize_workspace.py            # apply
    python3 fabric/organize_workspace.py --dry-run  # show the plan only
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile

WORKSPACE = "Healthcare-FabCon2026-Demo"
WORKSPACE_ID = "1b136d57-daff-4d47-85f6-a2cfcd405736"

# Folder layout mirrors the run-of-show, so the workspace itself reads as the
# story: platform, then each medallion hop, then ML, then delivery.
FOLDERS = [
    "00_Platform",
    "10_Bronze_Ingestion",
    "20_Silver_Preprocessing",
    "30_Gold_Curation",
    "35_Exploration",
    "40_MachineLearning",
    "50_Delivery",
    "90_Archive",
]

# Exact item display names -> folder. Anything not listed is left at the root
# and reported at the end, so new items are visible rather than silently filed.
PLACEMENT = {
    "00_Platform": [
        "NHS_PROMs_LH",            # schema-enabled; holds the Delta tables
        "NHS_PROMs_Lakehouse",     # original; holds Files, shortcut-ed into the above
        "proms_ml_env",
    ],
    "10_Bronze_Ingestion": [
        "10_bronze_ingest",
    ],
    "20_Silver_Preprocessing": [
        "20_silver_clean",
    ],
    "30_Gold_Curation": [
        "30_gold_features",
    ],
    "35_Exploration": [
        "31_data_exploration",
    ],
    "40_MachineLearning": [
        "40_train_register",
        "41_model_search",
        "42_threshold_analysis",
        "43_explainability",
        "50_batch_score",
        "knee-poor-outcome",        # MLflow experiment, once notebook 40 has run
        "knee-poor-outcome-ebm",    # registered model
    ],
    "50_Delivery": [
        "60_sync_app_db",
    ],
    "90_Archive": [
        # The original pandas notebooks. Kept for reference and for the
        # "here is what it looked like before Fabric" contrast on stage.
        "00_bootstrap_delta_tables",
        "01_all_dataset_exploration",
        "02_knee_data_exploration",
        "03_data_preprocessing",
        "04_feature_engineering",
        "05_modelling",
        "06_ebm_calibration",
        "07_ebm_explainability",
        # Strays from earlier experimentation.
        "lr-experiment-run-3683",
        "lr-model-version-5407",
        "lr-model-version-6724",
        "Experiment",
        "okok",
        "xgboost-model",
    ],
}

# SQL analytics endpoints are generated alongside their Lakehouse and cannot be
# moved independently; they follow the Lakehouse. Skip without complaining.
UNMOVABLE_TYPES = {"SQLEndpoint"}


def fab(*args: str) -> str:
    env = dict(os.environ)
    env["PATH"] = env.get("PATH", "") + os.pathsep + os.path.expanduser("~/.local/bin")
    proc = subprocess.run(["fab", *args], capture_output=True, text=True, env=env)
    return proc.stdout + proc.stderr


def api(method: str, path: str, body: dict | None = None) -> dict:
    args = ["api", "-X", method, path]
    tmp = None
    if body is not None:
        fd, tmp = tempfile.mkstemp(suffix=".json")
        with os.fdopen(fd, "w") as f:
            json.dump(body, f)
        args += ["-i", tmp]
    try:
        out = fab(*args)
    finally:
        if tmp:
            os.unlink(tmp)

    # `fab api` prefixes warnings ("Broker is unavailable...") and can append
    # trailing output, so decode the first JSON object rather than the whole
    # buffer — json.loads() chokes on both with "Extra data".
    start = out.find("{")
    if start == -1:
        raise RuntimeError(f"No JSON in response:\n{out}")
    obj, _ = json.JSONDecoder().raw_decode(out[start:])
    return obj


def list_folders() -> dict[str, str]:
    res = api("get", f"workspaces/{WORKSPACE_ID}/folders")
    return {f["displayName"]: f["id"] for f in res["text"]["value"]}


def list_items() -> list[dict]:
    res = api("get", f"workspaces/{WORKSPACE_ID}/items")
    return res["text"]["value"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    print(f"Workspace: {WORKSPACE}\n")

    # --- 1. create folders ---------------------------------------------------
    existing = list_folders()
    for name in FOLDERS:
        if name in existing:
            print(f"  folder exists   {name}")
            continue
        if args.dry_run:
            print(f"  would create    {name}")
            continue
        api("post", f"workspaces/{WORKSPACE_ID}/folders", {"displayName": name})
        print(f"  created         {name}")

    folders = existing if args.dry_run else list_folders()

    # --- 2. move items -------------------------------------------------------
    target_of = {
        item_name: folder
        for folder, names in PLACEMENT.items()
        for item_name in names
    }

    print()
    unplaced: list[str] = []
    for item in list_items():
        name, itype = item["displayName"], item["type"]
        if itype in UNMOVABLE_TYPES:
            continue
        folder_name = target_of.get(name)

        if folder_name is None:
            unplaced.append(f"{name} ({itype})")
            continue

        folder_id = folders.get(folder_name)
        if folder_id is None:
            if args.dry_run and folder_name in FOLDERS:
                print(f"  would move      {name:<32} -> {folder_name}")
            else:
                print(f"  ! folder missing for {name}: {folder_name}")
            continue
        if item.get("folderId") == folder_id:
            print(f"  in place        {name}")
            continue
        if args.dry_run:
            print(f"  would move      {name:<32} -> {folder_name}")
            continue

        try:
            api("post", f"workspaces/{WORKSPACE_ID}/items/{item['id']}/move",
                {"targetFolderId": folder_id})
            print(f"  moved           {name:<32} -> {folder_name}")
        except Exception as e:
            print(f"  ! failed        {name}: {e}")

    if unplaced:
        print("\nLeft at workspace root (add them to PLACEMENT if they should be filed):")
        for u in sorted(unplaced):
            print(f"  - {u}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
