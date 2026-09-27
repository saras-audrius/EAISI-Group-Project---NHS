import fs from 'node:fs/promises';
import path from 'node:path';

const sources = [
  ['exploration', 'code/Finalized notebooks/01_all_dataset_exploration.ipynb'],
  ['modelling', 'code/Finalized notebooks/05_modelling.ipynb'],
  ['calibration', 'code/Finalized notebooks/06_ebm_calibration.ipynb'],
  ['explainability', 'code/Finalized notebooks/07_ebm_explainability.ipynb'],
];
await fs.mkdir('.pptx-build/notebook-images', { recursive: true });
for (const [label, file] of sources) {
  const nb = JSON.parse(await fs.readFile(file, 'utf8'));
  let i = 0;
  for (const cell of nb.cells ?? []) {
    for (const output of cell.outputs ?? []) {
      const png = output.data?.['image/png'];
      if (!png) continue;
      const raw = Array.isArray(png) ? png.join('') : png;
      const out = `.pptx-build/notebook-images/${label}-${String(++i).padStart(2, '0')}.png`;
      await fs.writeFile(out, Buffer.from(raw, 'base64'));
    }
  }
}
