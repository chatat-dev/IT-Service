const fs = require('fs');
const path = require('path');

const files = [
    './app/it/computers/add/page.js',
    './app/it/computers/[id]/page.js'
];

const labelMap = {
    'Assignment & Location': 'assignmentLocation',
    'Search Employee ID to Auto-fill': 'searchEmpId',
    'Employee ID': 'employeeId',
    'Full Name': 'employeeName',
    'Extension No. / Desk Phone': 'extNoPhone',
    'Location': 'location',
    'Company': 'company',
    'Building Name': 'buildingName',
    'Site': 'site',
    'Department': 'department',
    'Hardware Details': 'hardwareDetails',
    'Device Type': 'deviceType',
    'Select Type': 'selectType',
    'PC Asset No.': 'pcAssetNo',
    'Device Name': 'deviceName',
    'Notebook Brand & Model': 'notebookBrandModel',
    'Serial Number (S/N)': 'serialNumberSn',
    'Status PC': 'statusPc',
    'Active': 'active',
    'Inactive': 'inactive',
    'Software Details': 'softwareDetails',
    'Operating System': 'os',
    'Select OS': 'selectOs',
    'Windows Product Key': 'windowsProductKey',
    'MS Office': 'msOffice',
    'Select Office': 'selectOffice',
    'Lifecycle Details': 'lifecycleDetails',
    'Purchase Date': 'purchaseDate',
    'Issue Date': 'issueDate',
    'Device Age': 'deviceAge',
    'Service Life Group': 'serviceLifeGroup',
    'System & Status': 'systemStatus',
    'CPU Core': 'cpuCore',
    'RAM (GB)': 'ramGb',
    'Script Install Status': 'scriptInstallStatus',
    'Select Status': 'selectStatus',
    'VPN Status': 'vpnStatus',
    'Backup Status': 'backupStatus',
    'Yes': 'yes',
    'No': 'no',
    'UPS Asset No.': 'upsAssetNo',
    'Accessories': 'accessories',
    'Notes': 'notes',
    'Add Note': 'addNote',
    'Remove': 'removeNote',
    'Select Location': 'selectLocation',
    'Select Company': 'selectCompany',
    'Select Site': 'selectSite',
    'Select Department': 'selectDepartment',
    'Confirm Add Computer': 'confirmAddComputer',
    'Are you sure you want to add this computer to the inventory?': 'confirmAddComputerMsg'
};

files.forEach(file => {
    try {
        const fullPath = path.resolve(__dirname, file);
        let content = fs.readFileSync(fullPath, 'utf8');

        // Replace inner text of <label> tags
        for (const [text, key] of Object.entries(labelMap)) {
            // Regex to match plain text inside React tags or placeholders
            // E.g., >Employee ID< -> >{t('employeeId')}<
            const tagRegex = new RegExp(`>\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<`, 'g');
            content = content.replace(tagRegex, `>{t('${key}')}<`);

            // Also match "Select Location" options
            const optionRegex = new RegExp(`<option value="">\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</option>`, 'g');
            content = content.replace(optionRegex, `<option value="">{t('${key}')}</option>`);

            // Also match placeholders in inputs
            const placeholderRegex = new RegExp(`placeholder="${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
            content = content.replace(placeholderRegex, `placeholder={t('${key}')}`);

            // Also match titles/messages in Confirm dialog
            const titleRegex = new RegExp(`title: '${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g');
            content = content.replace(titleRegex, `title: t('${key}')`);

            const msgRegex = new RegExp(`message: '${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g');
            content = content.replace(msgRegex, `message: t('${key}')`);
        }

        fs.writeFileSync(fullPath, content);
        console.log(`✅ Fixed Translations applied to: ${file}`);
    } catch (err) {
        console.error(`❌ Failed on ${file}:`, err.message);
    }
});
