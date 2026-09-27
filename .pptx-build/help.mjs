import { FileBlob, PresentationFile } from '@oai/artifact-tool';
const p = await PresentationFile.importPptx(await FileBlob.load('fabcon/EMFCC26_NotebookToBedside(2).pptx'));
console.log(p.help('*', { search: 'slide.images.deleteAll|slide.tables.deleteAll|slide.charts.deleteAll|deleteAll', include: ['index','examples','notes'], maxChars: 12000 }).ndjson);
