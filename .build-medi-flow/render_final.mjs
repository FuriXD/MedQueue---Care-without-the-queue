import fs from "node:fs/promises";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const out = "../output/MediFlow_Mini_Project_Review_Deliverable.pptx";
const dir = "./final-renders";
await fs.mkdir(dir, { recursive: true });
const deck = await PresentationFile.importPptx(await FileBlob.load(out));
const summary = await deck.inspect({ select: "$.slides[*]", include: ["id", "index", "title", "elements.text", "elements.position"] });
await fs.writeFile("./final-inspect.ndjson", summary.ndjson);
for (const [i, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(`${dir}/slide-${String(i+1).padStart(2,"0")}.png`, new Uint8Array(await png.arrayBuffer()));
}
const montage = await deck.export({ format: "png", montage: true, scale: 0.5 });
await fs.writeFile(`${dir}/montage.png`, new Uint8Array(await montage.arrayBuffer()));
console.log(`slides=${deck.slides.items.length}`);
