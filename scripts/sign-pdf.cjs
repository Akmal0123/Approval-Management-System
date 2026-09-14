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

        // ==========================================
        // 1. PROSES TANDA TANGAN (GAMBAR ATAU QR)
        // ==========================================
        for (const sig of inputData.signatures || []) {
            const pageIndex = Math.min(Math.max(sig.page - 1, 0), pages.length - 1);
            const page = pages[pageIndex];

            let img = null;
            const shouldDrawImage = sig.show_signature !== false;

            if (sig.qrText) {
                try {
                    const QRCode = require('qrcode');
                    const qrPngBuffer = await QRCode.toBuffer(sig.qrText, {
                        type: 'png',
                        margin: 1,
                        width: 300 // resolusi tinggi
                    });
                    img = await pdfDoc.embedPng(qrPngBuffer);
                } catch (qrErr) {
                    console.error('Failed to generate signature QR code:', qrErr.message);
                    continue;
                }
            } else if (shouldDrawImage && sig.imagePath && fs.existsSync(sig.imagePath)) {
                try {
                    const imgBytes = fs.readFileSync(sig.imagePath);

                    // Pengecekan magic bytes untuk format file PNG/JPG yang akurat
                    const isPng = imgBytes.length > 4 && imgBytes[0] === 0x89 && imgBytes[1] === 0x50 && imgBytes[2] === 0x4E && imgBytes[3] === 0x47;
                    const isJpg = imgBytes.length > 3 && imgBytes[0] === 0xFF && imgBytes[1] === 0xD8 && imgBytes[2] === 0xFF;

                    if (isPng) {
                        img = await pdfDoc.embedPng(imgBytes);
                    } else if (isJpg) {
                        img = await pdfDoc.embedJpg(imgBytes);
                    } else {
                        // Fallback
                        try {
                            img = await pdfDoc.embedPng(imgBytes);
                        } catch (e1) {
                            try {
                                img = await pdfDoc.embedJpg(imgBytes);
                            } catch (e2) {
                                console.error('Failed to embed signature image:', e2.message);
                                continue;
                            }
                        }
                    }
                } catch (imgErr) {
                    console.error('Failed reading/embedding image:', imgErr.message);
                    continue;
                }
            }

            if (!img && shouldDrawImage && !sig.add_text) {
                continue; // Lewati jika gambar gagal dimuat dan tidak ada teks
            }

            // Hitung Dimensi dan Titik Koordinat (1 mm = 72 / 25.4 points)
            const mmToPt = 72 / 25.4;
            const width = sig.width * mmToPt;
            const height = sig.height * mmToPt;

            const mediaBox = page.getMediaBox ? page.getMediaBox() : null;
            const pageX = mediaBox ? mediaBox.x : 0;
            const pageY = mediaBox ? mediaBox.y : 0;
            const pageHeight = page.getHeight();
            
            const x = pageX + (sig.x * mmToPt);
            const yFromBottom = pageY + pageHeight - (sig.y * mmToPt) - height;

            if (img) {
                page.drawImage(img, {
                    x: x,
                    y: yFromBottom,
                    width: width,
                    height: height,
                });
            }

            // Tambahkan Teks Approver & Tanggal
            if (sig.add_text) {
                const fontSize = 7;
                let currentY = (shouldDrawImage && img) ? (yFromBottom - 8) : (yFromBottom + height - 8);

                if (sig.name) {
                    page.drawText(sig.name, { x: x, y: currentY, size: fontSize, font: fontBold });
                    currentY -= 9;
                }

                if (sig.show_jabatan !== false && sig.jabatan) {
                    page.drawText(sig.jabatan, { x: x, y: currentY, size: fontSize, font: font });
                    currentY -= 9;
                }

                if (sig.show_date !== false && sig.date) {
                    page.drawText(sig.date, { x: x, y: currentY, size: fontSize - 1, font: font });
                }
            }
        }

       // ==========================================
        // 2. PROSES QR CODE GLOBAL DOKUMEN (FIX UTAMA)
        // ==========================================
       // Pastikan membaca inputData.qrCodes dengan benar
        const qrList = Array.isArray(inputData.qrCodes) && inputData.qrCodes.length > 0
            ? inputData.qrCodes
            : (inputData.qrCode ? [inputData.qrCode] : []);

        if (qrList.length > 0) {
            try {
                const QRCode = require('qrcode');
                const qrImageCache = {};

                for (const qr of qrList) {
                    if (!qr || !qr.text) continue;
                    
                    const pageIndex = Math.min(Math.max((qr.page || 1) - 1, 0), pages.length - 1);
                    const page = pages[pageIndex];

                    let qrImg = qrImageCache[qr.text];
                    if (!qrImg) {
                        const qrPngBuffer = await QRCode.toBuffer(qr.text, {
                            type: 'png',
                            margin: 1,
                            width: 300
                        });
                        qrImg = await pdfDoc.embedPng(qrPngBuffer);
                        qrImageCache[qr.text] = qrImg;
                    }

                    const mmToPt = 72 / 25.4;
                    const width = (qr.width || 25) * mmToPt;
                    const height = (qr.height || 25) * mmToPt;

                    const mediaBox = page.getMediaBox ? page.getMediaBox() : null;
                    const pageX = mediaBox ? mediaBox.x : 0;
                    const pageY = mediaBox ? mediaBox.y : 0;
                    const pageHeight = page.getHeight();
                    
                    const x = pageX + (qr.x * mmToPt);
                    const yFromBottom = pageY + pageHeight - (qr.y * mmToPt) - height;

                    page.drawImage(qrImg, {
                        x: x,
                        y: yFromBottom,
                        width: width,
                        height: height,
                    });
                }
            } catch (qrDocErr) {
                console.error('Failed to embed document QR code:', qrDocErr.message);
            }
        }

        // ==========================================
        // 3. SIMPAN PDF
        // ==========================================
        const signedBytes = await pdfDoc.save();
        if (inputData.outPath) {
            fs.writeFileSync(inputData.outPath, signedBytes);
        } else {
            process.stdout.write(Buffer.from(signedBytes));
        }

    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}

run();