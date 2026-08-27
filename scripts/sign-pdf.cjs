const { PDFDocument, StandardFonts } = require('pdf-lib');
const fs = require('fs');

async function run() {
    try {
        const args = process.argv.slice(2);
        if (args.length === 0) {
            console.error('Missing JSON input');
            process.exit(1);
        }

        const configPath = args[0];
        const inputData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        const pdfBytes = fs.readFileSync(inputData.pdfPath);
        
        // Load the PDF Document
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        for (const sig of inputData.signatures) {
            const pageIndex = Math.min(Math.max(sig.page - 1, 0), pages.length - 1);
            const page = pages[pageIndex];

            // Convert mm to PDF points (1 mm = 2.83465 points)
            const mmToPt = 2.83465;
            const width = sig.width * mmToPt;
            const height = sig.height * mmToPt;
            const x = sig.x * mmToPt;
            
            const pageHeight = page.getHeight();
            const yFromBottom = pageHeight - (sig.y * mmToPt) - height;

            const shouldDrawImage = sig.show_signature !== false;

            // Load signature image
            if (shouldDrawImage && sig.imagePath && fs.existsSync(sig.imagePath)) {
                const imgBytes = fs.readFileSync(sig.imagePath);
                
                let img;
                if (sig.imagePath.toLowerCase().endsWith('.png')) {
                    img = await pdfDoc.embedPng(imgBytes);
                } else if (sig.imagePath.toLowerCase().endsWith('.jpg') || sig.imagePath.toLowerCase().endsWith('.jpeg')) {
                    img = await pdfDoc.embedJpg(imgBytes);
                }

                if (img) {
                    page.drawImage(img, {
                        x: x,
                        y: yFromBottom,
                        width: width,
                        height: height,
                    });
                }
            }

            if (sig.add_text) {
                const fontSize = 7;
                let currentY = shouldDrawImage ? (yFromBottom - 8) : (yFromBottom + height - 8);

                // Draw Approver Name
                if (sig.name) {
                    page.drawText(sig.name, { x: x, y: currentY, size: fontSize, font: fontBold });
                    currentY -= 9;
                }

                // Draw Approver Jabatan
                if (sig.show_jabatan !== false && sig.jabatan) {
                    page.drawText(sig.jabatan, { x: x, y: currentY, size: fontSize, font: font });
                    currentY -= 9;
                }

                // Draw Date
                if (sig.show_date !== false && sig.date) {
                    page.drawText(sig.date, { x: x, y: currentY, size: fontSize - 1, font: font });
                }
            }
        }


        // Draw QR Code if provided in configuration
        if (inputData.qrCode) {
            const qr = inputData.qrCode;
            const pageIndex = Math.min(Math.max(qr.page - 1, 0), pages.length - 1);
            const page = pages[pageIndex];

            const QRCode = require('qrcode');
            const qrPngBuffer = await QRCode.toBuffer(qr.text, {
                type: 'png',
                margin: 1,
                width: 300 // sufficiently high resolution
            });

            const qrImg = await pdfDoc.embedPng(qrPngBuffer);

            const mmToPt = 2.83465;
            const width = qr.width * mmToPt;
            const height = qr.height * mmToPt;
            const x = qr.x * mmToPt;

            const pageHeight = page.getHeight();
            const yFromBottom = pageHeight - (qr.y * mmToPt) - height;

            page.drawImage(qrImg, {
                x: x,
                y: yFromBottom,
                width: width,
                height: height,
            });
        }

        const signedBytes = await pdfDoc.save();
        if (inputData.outPath) {
            fs.writeFileSync(inputData.outPath, signedBytes);
        } else {
            process.stdout.write(signedBytes);
        }
        
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}

run();
