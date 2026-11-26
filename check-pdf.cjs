const fs = require("fs");
const { PDFDocument } = require("pdf-lib");

async function check() {
    const file = "storage/app/private/dokumen_signed/12/unapprove_dokumen_20261029_153347_signed.pdf";
    const bytes = fs.readFileSync(file);
    const doc = await PDFDocument.load(bytes);
    const p = doc.getPages()[0];
    console.log("Width:", p.getWidth());
    console.log("Height:", p.getHeight());
    console.log("Rotation:", p.getRotation());
    console.log("MediaBox:", p.getMediaBox());
}
check();
