const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function inspect(filePath) {
    try {
        const bytes = fs.readFileSync(filePath);
        const doc = await PDFDocument.load(bytes);

        const standard = {
            'Title': doc.getTitle() || '-',
            'Author': doc.getAuthor() || '-',
            'Subject': doc.getSubject() || '-',
            'Producer': doc.getProducer() || '-',
            'Creator': doc.getCreator() || '-',
            'CreationDate': doc.getCreationDate() ? doc.getCreationDate().toISOString() : '-',
            'ModificationDate': doc.getModificationDate() ? doc.getModificationDate().toISOString() : '-',
        };

        const custom = {};
        const info = doc.getInfoDict();
        for (const [key, val] of info.entries()) {
            const rawKey = key.asString().replace(/^\//, '').replace(/#20/g, ' ');
            let valStr = '';
            try {
                valStr = val.decodeText ? val.decodeText() : val.toString();
            } catch (e) {
                valStr = val.toString();
            }
            custom[rawKey] = valStr;
        }

        console.log(JSON.stringify({ standard, custom, keywords: doc.getKeywords() || '-' }));
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}

if (process.argv[2]) {
    inspect(process.argv[2]);
} else {
    console.error('Missing PDF file path argument');
    process.exit(1);
}
