import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const source = path.resolve('fabcon/EMFCC26_NotebookToBedside(2).pptx');
const presentation = await PresentationFile.importPptx(await FileBlob.load(source));
const snapshot = await presentation.inspect({
  kind: 'deck,slide,textbox,shape,image,table,chart,notes,layout',
  include: 'id,slide,name,title,textPreview,text,bbox,alt,rows,cols,chartType,placeholders',
  maxChars: 60000,
});
await fs.writeFile('.pptx-build/original-inspect.ndjson', snapshot.ndjson);
console.log(snapshot.ndjson);
