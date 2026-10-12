import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const deck = await PresentationFile.importPptx(await FileBlob.load("./template.pptx"));
const sl = deck.slides.items[1].duplicate();
console.log("slide", sl.id, Object.keys(sl));
console.log("shapes", sl.shapes.items.map(x => ({id:x.id, pos:x.position, text: String(x.text)})));
