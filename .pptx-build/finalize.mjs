import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { finalizePresentation } from '/Users/sarasaudrius/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.61513/skills/presentations/container_tools/artifact_tool_utils.mjs';

const workspaceDir = process.cwd();
const skillDir = '/Users/sarasaudrius/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.61513/skills/presentations';
const finalPath = path.join(workspaceDir, 'fabcon', 'EMFCC26_NotebookToBedside_finished_v2.pptx');
await fs.mkdir(path.dirname(finalPath), { recursive: true });
const result = await finalizePresentation({
  workspaceDir,
  candidatePath: path.join(workspaceDir, '.pptx-build', 'candidate.pptx'),
  finalPath,
  pythonExecutable: '/Users/sarasaudrius/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',
  integrityValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
  verifyArtifactToolImport: true,
  receiptPath: path.join(workspaceDir,'.pptx-build','validation-v2.json'),
});
console.log(JSON.stringify(result,null,2));
