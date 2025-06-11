const ExcelJS = require('exceljs');

function convertToCSV(data) {
    if (!data || !data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Handle values that need escaping
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

async function convertToXLSX(data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Browser History');
    
    if (!data || !data.length) {
        return await workbook.xlsx.writeBuffer();
    }
    
    // Add headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    
    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add data
    data.forEach(row => {
        worksheet.addRow(headers.map(header => row[header]));
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
        column.width = Math.max(
            Math.max(...worksheet.getColumn(column.number).values.map(v => v ? v.toString().length : 0)),
            headers[column.number - 1].length
        ) + 2;
    });
    
    return await workbook.xlsx.writeBuffer();
}

module.exports = {
    convertToCSV,
    convertToXLSX
}; 