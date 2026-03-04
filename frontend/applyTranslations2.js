const fs = require('fs');
const path = require('path');

const files = [
    './app/it/computers/add/page.js',
    './app/it/computers/[id]/page.js'
];

const labelMap = {
    'Specifications & Software': 'specificationsSoftware',
    'Network & Additional Assets': 'networkAdditionalAssets',
    'Lifespan & Warranty': 'lifespanWarranty',
    'Additional Notes': 'additionalNotes',
    'Select MS Office': 'selectMsOffice'
};

const placeholderMap = {
    'e.g. Intel Core i5-12400F': 'egCpu',
    'e.g. 16GB': 'egRam',
    'Mouse, Keyboard, Bag...': 'accessoriesPlaceholder'
};

const specialMap = {
    'Device Age (Auto-calculated)': 'deviceAgeAuto',
    'Service Life Group (Auto)': 'serviceLifeGroupAuto'
};

files.forEach(file => {
    try {
        const fullPath = path.resolve(__dirname, file);
        let content = fs.readFileSync(fullPath, 'utf8');

        // Replace H2 Headers (which can have an icon inside, so just replace the text part)
        for (const [text, key] of Object.entries(labelMap)) {
            // regex: match ">" followed by optional space, the exact text, optional space, and "<"
            const h2Regex = new RegExp(`>(\\s*)${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*)<`, 'g');
            content = content.replace(h2Regex, `>$1{t('${key}')}$2<`);

            // Also replace direct labels/options just in case
            const tagRegex = new RegExp(`>\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<`, 'g');
            content = content.replace(tagRegex, `>{t('${key}')}<`);
        }

        // Replace placeholders
        for (const [text, key] of Object.entries(placeholderMap)) {
            const placeholderRegex = new RegExp(`placeholder="${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
            content = content.replace(placeholderRegex, `placeholder={t('${key}')}`);
        }

        // Replace special mapped labels
        for (const [text, key] of Object.entries(specialMap)) {
            const tagRegex = new RegExp(`>\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<`, 'g');
            content = content.replace(tagRegex, `>{t('${key}')}<`);
        }

        fs.writeFileSync(fullPath, content);
        console.log(`✅ Translations applied to: ${file}`);
    } catch (err) {
        console.error(`❌ Failed on ${file}:`, err.message);
    }
});
