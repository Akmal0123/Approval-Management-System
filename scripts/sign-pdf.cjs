const { PDFDocument, StandardFonts, PDFName, PDFHexString } = require('pdf-lib');
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

        for (const sig of inputData.signatures || []) {
            const pageIndex = Math.min(Math.max(sig.page - 1, 0), pages.length - 1);
            const page = pages[pageIndex];

            let img = null;
            if (sig.qrText) {
                try {
                    const QRCode = require('qrcode');
                    const qrPngBuffer = await QRCode.toBuffer(sig.qrText, {
                        type: 'png',
                        margin: 1,
                        width: 300 // sufficiently high resolution
                    });
                    img = await pdfDoc.embedPng(qrPngBuffer);
                } catch (qrErr) {
                    console.error('Failed to generate signature QR code:', qrErr.message);
                    continue;
                }
            } else if (sig.imagePath && fs.existsSync(sig.imagePath)) {
                try {
                    const imgBytes = fs.readFileSync(sig.imagePath);

                    // Check magic bytes:
                    // PNG starts with: 89 50 4E 47
                    // JPEG starts with: FF D8 FF
                    const isPng = imgBytes.length > 4 && imgBytes[0] === 0x89 && imgBytes[1] === 0x50 && imgBytes[2] === 0x4E && imgBytes[3] === 0x47;
                    const isJpg = imgBytes.length > 3 && imgBytes[0] === 0xFF && imgBytes[1] === 0xD8 && imgBytes[2] === 0xFF;

                    if (isPng) {
                        img = await pdfDoc.embedPng(imgBytes);
                    } else if (isJpg) {
                        img = await pdfDoc.embedJpg(imgBytes);
                    } else {
                        // Fallback: try PNG first, then JPG
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
            } else {
                continue; // Missing image or QR text
            }

            if (!img) continue;

            // Convert mm to PDF points (Exact: 72 points / 25.4 mm)
            const mmToPt = 72 / 25.4;
            const width = sig.width * mmToPt;
            const height = sig.height * mmToPt;

            // In PDF-lib, Y is from bottom to top. 
            // Also account for possible non-zero MediaBox origin (e.g. crop margins).
            const mediaBox = page.getMediaBox ? page.getMediaBox() : null;
            const pageX = mediaBox ? mediaBox.x : 0;
            const pageY = mediaBox ? mediaBox.y : 0;
            const pageHeight = page.getHeight();
            const x = pageX + (sig.x * mmToPt);
            const yFromBottom = pageY + pageHeight - (sig.y * mmToPt) - height;

            page.drawImage(img, {
                x: x,
                y: yFromBottom,
                width: width,
                height: height,
            });

            if (sig.add_text) {
                const fontSize = 8;
                const textY = yFromBottom - 10;
                if (sig.text) {
                    page.drawText(sig.text, { x: x, y: textY, size: fontSize, font: font });
                }
                if (sig.date) {
                    page.drawText(sig.date, { x: x, y: textY - 10, size: fontSize, font: font });
                }
            }
        }

        // Draw Document QR Codes if provided in configuration
        const qrList = Array.isArray(inputData.qrCodes) && inputData.qrCodes.length > 0
            ? inputData.qrCodes
            : (inputData.qrCode ? [inputData.qrCode] : []);

        if (qrList.length > 0) {
            try {
                const QRCode = require('qrcode');
                const qrImageCache = {};

                for (const qr of qrList) {
                    const pageIndex = Math.min(Math.max(qr.page - 1, 0), pages.length - 1);
                    const page = pages[pageIndex];

                    let qrImg = qrImageCache[qr.text];
                    if (!qrImg) {
                        const qrPngBuffer = await QRCode.toBuffer(qr.text, {
                            type: 'png',
                            margin: 1,
                            width: 300 // sufficiently high resolution
                        });
                        qrImg = await pdfDoc.embedPng(qrPngBuffer);
                        qrImageCache[qr.text] = qrImg;
                    }

                    const mmToPt = 72 / 25.4;
                    const width = qr.width * mmToPt;
                    const height = qr.height * mmToPt;

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

        // Apply PDF Metadata and Cryptographic Security Attributes
        if (inputData.metadata) {
            const meta = inputData.metadata;

            // Standard PDF metadata
            if (meta.title) pdfDoc.setTitle(meta.title);
            if (meta.authors || meta.author) pdfDoc.setAuthor(meta.authors || meta.author);
            if (meta.subject) pdfDoc.setSubject(meta.subject);
            if (meta.keywords && Array.isArray(meta.keywords)) {
                pdfDoc.setKeywords(meta.keywords);
            }
            pdfDoc.setProducer('Approval Management System (AMS) Cryptographic Engine');
            pdfDoc.setCreator('Approval Management System');

            if (meta.creation_date) {
                try {
                    pdfDoc.setCreationDate(new Date(meta.creation_date));
                } catch (e) {}
            }
            pdfDoc.setModificationDate(new Date());

            // Set Custom Document Information Dictionary entries
            // These will appear directly in PDF viewers' "Custom" properties (Adobe Acrobat, Foxit, etc.)
            // and CLI inspection tools (exiftool, pdfinfo, python, etc.)
            const infoDict = pdfDoc.getInfoDict();
            const setCustomAttr = (key, val) => {
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    infoDict.set(PDFName.of(key), PDFHexString.fromText(String(val)));
                }
            };

            // Exact attributes requested by user:
            setCustomAttr('authors', meta.authors || 'Approval Management System');
            setCustomAttr('signed by', meta.signed_by || '-');
            setCustomAttr('signed at', meta.signed_at || '-');

            // Standard PascalCase & canonical attributes for PDF inspection tools:
            setCustomAttr('Author', meta.authors || 'Approval Management System');
            setCustomAttr('SignedBy', meta.signed_by || '-');
            setCustomAttr('SignedAt', meta.signed_at || '-');
            setCustomAttr('DocumentNumber', meta.document_number || '');
            setCustomAttr('DocumentHash', meta.document_hash || '');
            setCustomAttr('CryptographicSeal', meta.cryptographic_seal || '');
            setCustomAttr('SecurityAlgorithm', meta.algorithm || 'HMAC-SHA256 / SHA-256');
            setCustomAttr('VerificationUrl', meta.verification_url || '');
            setCustomAttr('SecurityNotice', meta.security_notice || 'Cryptographically sealed and verified by Approval Management System');
        }

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
