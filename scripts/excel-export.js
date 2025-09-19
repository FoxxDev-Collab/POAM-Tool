/* Modern Excel Export Module
   - Creates true XLSX files using SheetJS library
   - Professional formatting with colors and styling
   - Compatible with Excel 2016+ Trust Center settings
*/

class ExcelExporter {
  constructor() {
    this.workbook = null;
  }

  // Prefer local ExcelJS if available (offline), else SheetJS via CDN, else CSV
  isExcelJSAvailable() {
    return typeof window.ExcelJS !== 'undefined';
  }

  // Check if SheetJS is available (for online environments)
  isSheetJSAvailable() {
    return typeof window.XLSX !== 'undefined';
  }

  // Try to load SheetJS library dynamically (will fail in air-gapped)
  async tryLoadSheetJS() {
    if (window.XLSX) return true; // Already loaded
    
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      script.timeout = 5000; // 5 second timeout
      setTimeout(() => resolve(false), 5000);
      document.head.appendChild(script);
    });
  }

  // Create Excel file - tries XLSX first, falls back to enhanced CSV
  async createWorkbook(data, filename = 'STIG_NIST_Mapping') {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    // 1) Try ExcelJS offline first
    if (this.isExcelJSAvailable()) {
      try {
        const worksheetData = this.prepareWorksheetData(data);
        const wb = new window.ExcelJS.Workbook();
        const ws = wb.addWorksheet('STIG Mapping');

        // Set columns based on headers
        const headers = worksheetData[0];
        ws.columns = headers.map(h => ({ header: h, key: h, width: 20 }));
        // Add data rows
        for (let i = 1; i < worksheetData.length; i++) {
          ws.addRow(worksheetData[i]);
        }

        // Styling: header row
        const headerRow = ws.getRow(1);
        headerRow.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        // Column widths (align with headers order)
        const colWidths = [15,12,15,12,15,12,40,10,15,25,50,50,50];
        ws.columns.forEach((col, idx) => { col.width = colWidths[idx] || 20; });

        // Row formatting and conditional colors for severity/status
        for (let r = 2; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          row.eachCell(cell => {
            cell.alignment = { vertical: 'top', wrapText: true };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          });
          // Severity at column 8 (1-based index)
          const severityCell = row.getCell(8);
          const sev = String(severityCell.value || '').toLowerCase();
          let sevColor = null;
          if (sev === 'critical') sevColor = 'FFFFE6E6';
          else if (sev === 'high') sevColor = 'FFFFF2E6';
          else if (sev === 'medium') sevColor = 'FFFFFBE6';
          else if (sev === 'low') sevColor = 'FFE6F7E6';
          if (sevColor) severityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sevColor } };

          // Status at column 9
          const statusCell = row.getCell(9);
          const st = String(statusCell.value || '').toLowerCase();
          let stColor = null;
          if (st === 'open' || st === 'failed') stColor = 'FFFFE6E6';
          else if (st === 'not_a_finding' || st === 'passed') stColor = 'FFE6F7E6';
          else if (st === 'not_applicable') stColor = 'FFF0F0F0';
          else if (st === 'not_reviewed') stColor = 'FFE6F0FF';
          if (stColor) statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stColor } };
        }

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        this.downloadBlob(blob, `${filename}_${timestamp}.xlsx`);
        return;
      } catch (err) {
        console.warn('ExcelJS generation failed, trying SheetJS:', err);
      }
    }

    // 2) Try to use SheetJS for true XLSX
    const sheetJSLoaded = await this.tryLoadSheetJS();
    if (sheetJSLoaded && window.XLSX) {
      try {
        const worksheetData = this.prepareWorksheetData(data);
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Apply formatting and styling
        this.applyXLSXFormatting(ws, worksheetData, data);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, "STIG Mapping");
        
        // Generate and download XLSX file
        XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
        return;
      } catch (error) {
        console.warn('XLSX generation failed, falling back to CSV:', error);
      }
    }
    
    // Fallback to enhanced CSV for air-gapped environments
    console.log('Air-gapped mode: Using enhanced CSV export');
    await this.createEnhancedCSV(data, filename);
  }

  // Enhanced CSV export with Excel-compatible formatting
  async createEnhancedCSV(data, filename = 'STIG_NIST_Mapping') {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const worksheetData = this.prepareWorksheetData(data);
    
    // Create CSV with metadata header
    let csvContent = `"STIG to NIST Control Mapping Report"\n`;
    csvContent += `"Generated: ${new Date().toLocaleString()}"\n`;
    csvContent += `"Total Records: ${data.length}"\n`;
    csvContent += `"Export Format: Enhanced CSV (Air-gapped Compatible)"\n`;
    csvContent += `\n`; // Empty line
    
    // Add the actual data
    csvContent += this.convertToCSV(worksheetData);
    
    // Download with .csv extension
    this.downloadCSV(csvContent, `${filename}_${timestamp}.csv`);
  }

  // Apply professional formatting to XLSX worksheet
  applyXLSXFormatting(ws, worksheetData, originalData) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // NIST Control(s)
      { wch: 12 }, // NIST Family
      { wch: 15 }, // CCI(s)
      { wch: 12 }, // Vuln-ID
      { wch: 15 }, // Rule-ID
      { wch: 12 }, // Rule Version
      { wch: 40 }, // Title
      { wch: 10 }, // Severity
      { wch: 15 }, // Status
      { wch: 25 }, // STIG Name
      { wch: 50 }, // Discussion
      { wch: 50 }, // Check Text
      { wch: 50 }  // Fix Text
    ];
    ws['!cols'] = colWidths;
    
    // Format header row
    for (let col = 0; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellRef]) continue;
      
      ws[cellRef].s = {
        fill: { fgColor: { rgb: "4472C4" } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }
    
    // Format data rows with conditional formatting
    for (let row = 1; row <= range.e.r; row++) {
      const dataIndex = row - 1;
      const rowData = originalData[dataIndex];
      
      for (let col = 0; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellRef]) continue;
        
        let fillColor = row % 2 === 0 ? "F8F9FA" : "FFFFFF"; // Alternating rows
        
        // Apply severity-based coloring
        if (rowData && col === 7) { // Severity column
          switch (rowData.severity?.toLowerCase()) {
            case 'critical': fillColor = "FFE6E6"; break;
            case 'high': fillColor = "FFF2E6"; break;
            case 'medium': fillColor = "FFFBE6"; break;
            case 'low': fillColor = "E6F7E6"; break;
          }
        }
        
        // Apply status-based coloring
        if (rowData && col === 8) { // Status column
          switch (rowData.status?.toLowerCase()) {
            case 'open':
            case 'failed': fillColor = "FFE6E6"; break;
            case 'not_a_finding':
            case 'passed': fillColor = "E6F7E6"; break;
            case 'not_applicable': fillColor = "F0F0F0"; break;
            case 'not_reviewed': fillColor = "E6F0FF"; break;
          }
        }
        
        ws[cellRef].s = {
          fill: { fgColor: { rgb: fillColor } },
          alignment: { vertical: "top", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } }
          }
        };
      }
    }
    
    // Set row heights for better readability
    const rowHeights = [];
    rowHeights[0] = { hpt: 25 }; // Header row
    for (let i = 1; i <= range.e.r; i++) {
      rowHeights[i] = { hpt: 60 }; // Data rows
    }
    ws['!rows'] = rowHeights;
  }

  prepareWorksheetData(rows) {
    const headers = [
      'NIST Control(s)',
      'NIST Family',
      'CCI(s)',
      'Vuln-ID',
      'Rule-ID', 
      'Rule Version',
      'Title',
      'Severity',
      'Status',
      'STIG Name',
      'Discussion',
      'Check Text',
      'Fix Text'
    ];

    const data = [headers];
    
    rows.forEach(row => {
      data.push([
        row.nistControls.join(', ') || '-',
        row.families.join(', ') || '-',
        row.ccis.join(', ') || '-',
        row.group_id || '',
        row.rule_id || '',
        row.rule_version || '',
        row.rule_title || '',
        row.severity || '',
        row.status || '',
        row.stig_name || '',
        this.cleanText(row.discussion || ''),
        this.cleanText(row.checkContent || ''),
        this.cleanText(row.fixText || '')
      ]);
    });

    return data;
  }

  cleanText(text) {
    if (!text) return '';
    // Remove excessive whitespace and normalize line breaks
    return text.replace(/\r\n/g, '\n')
               .replace(/\r/g, '\n')
               .replace(/\n{3,}/g, '\n\n')
               .trim();
  }

  // Fallback CSV export for compatibility
  async createCSVExport(data, filename = 'STIG_NIST_Mapping') {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const worksheetData = this.prepareWorksheetData(data);
    const csvContent = this.convertToCSV(worksheetData);
    
    this.downloadCSV(csvContent, `${filename}_${timestamp}.csv`);
  }

  convertToCSV(data) {
    return data.map(row => {
      return row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',');
    }).join('\n');
  }

  downloadCSV(csvContent, filename) {
    // Add BOM for proper Excel UTF-8 handling
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Create POAM (Plan of Action and Milestones) export
  async createPOAMExport(data, filename = 'POAM_Report') {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    // 1) Try ExcelJS offline first
    if (this.isExcelJSAvailable()) {
      try {
        const poamData = this.preparePOAMData(data);
        const wb = new window.ExcelJS.Workbook();
        const ws = wb.addWorksheet('POAM');

        // Add all rows
        poamData.forEach((arr, idx) => ws.addRow(arr));

        // Merge title row across 12 columns
        ws.mergeCells(1, 1, 1, 12);
        const titleCell = ws.getCell(1, 1);
        titleCell.font = { bold: true, size: 16 };
        titleCell.alignment = { horizontal: 'center' };

        // Header row styling at row 7 (since we push 6 lines then headers)
        const headerRowIdx = 7;
        const headerRow = ws.getRow(headerRowIdx);
        headerRow.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        // Column widths
        const colWidths = [15,40,15,25,12,10,30,20,20,15,30,15];
        ws.columns.forEach((c, i) => { c.width = colWidths[i] || 20; });

        // Risk color on column E (5)
        for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const riskCell = row.getCell(5);
          const v = String(riskCell.value || '');
          let color = null;
          if (v === 'High') color = 'FFFFE6E6';
          else if (v === 'Medium') color = 'FFFFFBE6';
          else if (v === 'Low') color = 'FFE6F7E6';
          if (color) riskCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
          row.eachCell(cell => { cell.alignment = { vertical: 'top', wrapText: true }; });
        }

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        this.downloadBlob(blob, `${filename}_${timestamp}.xlsx`);
        return;
      } catch (err) {
        console.warn('POAM ExcelJS generation failed, trying SheetJS:', err);
      }
    }

    // 2) Try to use SheetJS for true XLSX
    const sheetJSLoaded = await this.tryLoadSheetJS();
    if (sheetJSLoaded && window.XLSX) {
      try {
        const poamData = this.preparePOAMData(data);
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(poamData);
        
        // Apply POAM-specific formatting
        this.applyPOAMFormatting(ws, poamData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, "POAM");
        
        // Generate and download XLSX file
        XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
        return;
      } catch (error) {
        console.warn('POAM XLSX generation failed, falling back to CSV:', error);
      }
    }
    
    // Fallback to enhanced CSV for air-gapped environments
    console.log('Air-gapped mode: Using enhanced CSV for POAM export');
    await this.createPOAMCSV(data, filename);
  }

  // Enhanced POAM CSV export for air-gapped environments
  async createPOAMCSV(data, filename = 'POAM_Report') {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const poamData = this.preparePOAMData(data);
    
    // Create CSV with POAM header information
    let csvContent = `"PLAN OF ACTION AND MILESTONES (POA&M)"\n`;
    csvContent += `\n`;
    csvContent += `"System Name:",\n`;
    csvContent += `"System Owner:",\n`;
    csvContent += `"Date Prepared:","${new Date().toLocaleDateString()}"\n`;
    csvContent += `"Export Format:","Enhanced CSV (Air-gapped Compatible)"\n`;
    csvContent += `\n`;
    
    // Add the POAM data starting from the headers (skip the title rows)
    const dataRows = poamData.slice(6); // Skip title and metadata rows
    csvContent += this.convertToCSV(dataRows);
    
    // Download with .csv extension
    this.downloadCSV(csvContent, `${filename}_${timestamp}.csv`);
  }

  preparePOAMData(rows) {
    // Filter for only "open" status items
    const openItems = rows.filter(row => 
      row.status && row.status.toLowerCase() === 'open'
    );

    // POAM headers based on standard government template
    const headers = [
      'Item Identifier',
      'Weakness or Deficiency',
      'Security Control',
      'Weakness/Deficiency Identified by',
      'Risk Level',
      'Status',
      'Comments',
      'POC',
      'Resources Required',
      'Scheduled Completion Date',
      'Milestones',
      'Estimated Cost'
    ];

    const data = [
      // Header section
      ['PLAN OF ACTION AND MILESTONES (POA&M)'],
      [''],
      ['System Name:', ''],
      ['System Owner:', ''],
      ['Date Prepared:', new Date().toLocaleDateString()],
      [''],
      headers
    ];

    // Sort by Risk Level (High->Med->Low) then NIST Controls
    const sortedItems = openItems.sort((a, b) => {
      // Risk level priority
      const riskOrder = { 'high': 1, 'medium': 2, 'low': 3 };
      const aRisk = riskOrder[a.severity?.toLowerCase()] || 4;
      const bRisk = riskOrder[b.severity?.toLowerCase()] || 4;
      
      if (aRisk !== bRisk) return aRisk - bRisk;
      
      // Secondary sort by NIST controls
      const aControls = sortableNistControl(a.nistControls.join(', '));
      const bControls = sortableNistControl(b.nistControls.join(', '));
      return aControls.localeCompare(bControls);
    });

    // Add data rows
    sortedItems.forEach(row => {
      // Map severity to risk level
      let riskLevel = '';
      switch (row.severity?.toLowerCase()) {
        case 'critical':
        case 'high': riskLevel = 'High'; break;
        case 'medium': riskLevel = 'Medium'; break;
        case 'low': riskLevel = 'Low'; break;
        default: riskLevel = 'Unknown';
      }

      data.push([
        row.rule_id || row.group_id || '',
        row.rule_title || '',
        row.nistControls.join(', ') || '',
        row.stig_name || '',
        riskLevel,
        'Open',
        row.comments || '',
        '', // POC - to be filled manually
        '', // Resources Required - to be filled manually
        '', // Scheduled Completion Date - to be filled manually
        '', // Milestones - to be filled manually
        ''  // Estimated Cost - to be filled manually
      ]);
    });

    return data;
  }

  applyPOAMFormatting(ws, poamData) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // Item Identifier
      { wch: 40 }, // Weakness or Deficiency
      { wch: 15 }, // Security Control
      { wch: 25 }, // Weakness/Deficiency Identified by
      { wch: 12 }, // Risk Level
      { wch: 10 }, // Status
      { wch: 30 }, // Comments
      { wch: 20 }, // POC
      { wch: 20 }, // Resources Required
      { wch: 15 }, // Scheduled Completion Date
      { wch: 30 }, // Milestones
      { wch: 15 }  // Estimated Cost
    ];
    ws['!cols'] = colWidths;

    // Format title row
    const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[titleCell]) {
      ws[titleCell].s = {
        font: { bold: true, size: 16 },
        alignment: { horizontal: "center" }
      };
    }

    // Merge title cell across columns
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];

    // Format header row (row 6, 0-indexed)
    const headerRowIndex = 6;
    for (let col = 0; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
      if (!ws[cellRef]) continue;
      
      ws[cellRef].s = {
        fill: { fgColor: { rgb: "4472C4" } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }

    // Format data rows
    for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
      for (let col = 0; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellRef]) continue;
        
        let fillColor = "FFFFFF";
        
        // Risk level coloring (column 4)
        if (col === 4) {
          const cellValue = ws[cellRef].v;
          switch (cellValue) {
            case 'High': fillColor = "FFE6E6"; break;
            case 'Medium': fillColor = "FFFBE6"; break;
            case 'Low': fillColor = "E6F7E6"; break;
          }
        }
        
        ws[cellRef].s = {
          fill: { fgColor: { rgb: fillColor } },
          alignment: { vertical: "top", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } }
          }
        };
      }
    }
  }

  // Write a Blob to disk in-browser
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Build an Excel workbook with POAMs and Milestones (two sheets)
  async exportPOAMsWithMilestones(poams = [], milestones = [], filename = 'POAMs') {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    // Prefer ExcelJS
    if (this.isExcelJSAvailable()) {
      try {
        const wb = new window.ExcelJS.Workbook();

        // Sheet 1: POAMs
        const wsP = wb.addWorksheet('POAMs');
        const pHeaders = ['Title','Status','Priority','Assignee','Due Date','Progress','NIST Controls','Milestones','Created At','Updated At','Description'];
        wsP.addRow(pHeaders);
        (poams || []).forEach(p => {
          const msCount = (milestones || []).filter(m => m.poamId === p.id).length;
          wsP.addRow([
            p.title || '',
            p.status || '',
            p.priority || '',
            p.assignee || '',
            p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '',
            typeof p.progress === 'number' ? p.progress : '',
            Array.isArray(p.nistControls) ? p.nistControls.join(', ') : (p.nistControls || ''),
            msCount,
            p.createdAt ? new Date(p.createdAt).toLocaleString() : '',
            p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '',
            p.description || ''
          ]);
        });
        wsP.getRow(1).eachCell(c => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
          c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          c.alignment = { horizontal: 'center' };
        });
        wsP.columns.forEach((col, idx) => { col.width = [30,12,10,15,14,10,30,12,20,20,60][idx] || 20; });

        // Sheet 2: Milestones
        const wsM = wb.addWorksheet('Milestones');
        const mHeaders = ['Title','POAM Title','POAM ID','Status','Due Date','Notes','Created At','Updated At'];
        wsM.addRow(mHeaders);
        (milestones || []).forEach(m => {
          const related = (poams || []).find(p => p.id === m.poamId);
          wsM.addRow([
            m.title || '',
            related ? related.title : '',
            m.poamId || '',
            m.status || '',
            m.dueDate ? new Date(m.dueDate).toLocaleDateString() : '',
            m.notes || '',
            m.createdAt ? new Date(m.createdAt).toLocaleString() : '',
            m.updatedAt ? new Date(m.updatedAt).toLocaleString() : ''
          ]);
        });
        wsM.getRow(1).eachCell(c => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
          c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          c.alignment = { horizontal: 'center' };
        });
        wsM.columns.forEach((col, idx) => { col.width = [30,30,16,12,14,50,20,20][idx] || 20; });

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        this.downloadBlob(blob, `${filename}_${timestamp}.xlsx`);
        return { success: true };
      } catch (err) {
        console.warn('ExcelJS POAMs export failed, falling back to CSV:', err);
      }
    }

    // Fallback: CSVs for each sheet
    try {
      const pHeaders = ['Title','Status','Priority','Assignee','Due Date','Progress','NIST Controls','Milestones','Created At','Updated At','Description'];
      const pRows = [pHeaders].concat((poams || []).map(p => [
        p.title || '',
        p.status || '',
        p.priority || '',
        p.assignee || '',
        p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '',
        typeof p.progress === 'number' ? p.progress : '',
        Array.isArray(p.nistControls) ? p.nistControls.join(', ') : (p.nistControls || ''),
        (milestones || []).filter(m => m.poamId === p.id).length,
        p.createdAt ? new Date(p.createdAt).toLocaleString() : '',
        p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '',
        (p.description || '').replace(/\r?\n/g, ' ')
      ]));
      const pCsv = this.convertToCSV(pRows);
      this.downloadCSV(pCsv, `${filename}_POAMs_${timestamp}.csv`);

      const mHeaders = ['Title','POAM Title','POAM ID','Status','Due Date','Notes','Created At','Updated At'];
      const mRows = [mHeaders].concat((milestones || []).map(m => {
        const related = (poams || []).find(p => p.id === m.poamId);
        return [
          m.title || '',
          related ? related.title : '',
          m.poamId || '',
          m.status || '',
          m.dueDate ? new Date(m.dueDate).toLocaleDateString() : '',
          (m.notes || '').replace(/\r?\n/g, ' '),
          m.createdAt ? new Date(m.createdAt).toLocaleString() : '',
          m.updatedAt ? new Date(m.updatedAt).toLocaleString() : ''
        ];
      }));
      const mCsv = this.convertToCSV(mRows);
      this.downloadCSV(mCsv, `${filename}_Milestones_${timestamp}.csv`);
      return { success: true };
    } catch (e) {
      console.error('CSV POAMs export failed:', e);
      return { success: false, error: e.message };
    }
  }

}

// Export for use in main script
window.ExcelExporter = ExcelExporter;

// Helper function for proper NIST control sorting
function sortableNistControl(controlStr) {
  if (!controlStr) return '';
  
  // Extract the first control for sorting (in case of multiple controls)
  const firstControl = controlStr.split(',')[0].trim().toUpperCase();
  
  // Parse NIST control format: AC-2(1) -> family: AC, number: 2, enhancement: 1
  const match = firstControl.match(/^([A-Z]{2,3})-(\d+)(?:\((\d+)\))?/);
  if (!match) return controlStr.toLowerCase();
  
  const [, family, number, enhancement] = match;
  
  // Create sortable string: family + zero-padded number + zero-padded enhancement
  const paddedNumber = number.padStart(3, '0');
  const paddedEnhancement = (enhancement || '0').padStart(3, '0');
  
  return `${family}-${paddedNumber}-${paddedEnhancement}`;
}

// Global function for export button
async function exportToExcel() {
  let filteredData = [];
  
  // Try multiple sources to get the data
  if (typeof getFilteredRows === 'function') {
    filteredData = getFilteredRows();
  } else if (typeof VulnTable !== 'undefined' && VulnTable.applyFiltersAndGetRows) {
    filteredData = VulnTable.applyFiltersAndGetRows();
  } else if (window.app && window.app.getFilteredRows) {
    filteredData = window.app.getFilteredRows();
  } else {
    // Try to get data directly from DataManager
    try {
      const dataManager = (window.AppState && AppState.state && AppState.state.dataManager) 
        ? AppState.state.dataManager 
        : window.DataManager;
      
      if (dataManager) {
        if (typeof dataManager.restoreFromStorage === 'function') {
          dataManager.restoreFromStorage();
        }
        const stigData = await dataManager.getStigData();
        filteredData = stigData.rows || [];
      }
    } catch (error) {
      console.error('Error getting data from DataManager:', error);
    }
  }
  
  if (!filteredData || filteredData.length === 0) {
    alert('No data to export. Please load a CKLB file first.');
    return;
  }

  // Sort by NIST Controls A-Z for export using proper numeric ordering
  const sortedData = [...filteredData].sort((a, b) => {
    const aControls = sortableNistControl(a.nistControls.join(', '));
    const bControls = sortableNistControl(b.nistControls.join(', '));
    return aControls.localeCompare(bControls);
  });

  // Show format selection dialog
  const format = confirm('Choose export format:\nOK = Modern XLSX (Excel 2016+)\nCancel = CSV (universal compatibility)');
  
  const exporter = new ExcelExporter();
  if (format) {
    await exporter.createWorkbook(sortedData, 'STIG_NIST_Mapping');
  } else {
    await exporter.createCSVExport(sortedData, 'STIG_NIST_Mapping');
  }
}

// Global function for POAM export
async function exportPOAM() {
  let filteredData = [];
  
  // Try multiple sources to get the data
  if (typeof getFilteredRows === 'function') {
    filteredData = getFilteredRows();
  } else if (typeof VulnTable !== 'undefined' && VulnTable.applyFiltersAndGetRows) {
    filteredData = VulnTable.applyFiltersAndGetRows();
  } else if (window.app && window.app.getFilteredRows) {
    filteredData = window.app.getFilteredRows();
  } else {
    // Try to get data directly from DataManager
    try {
      const dataManager = (window.AppState && AppState.state && AppState.state.dataManager) 
        ? AppState.state.dataManager 
        : window.DataManager;
      
      if (dataManager) {
        if (typeof dataManager.restoreFromStorage === 'function') {
          dataManager.restoreFromStorage();
        }
        const stigData = await dataManager.getStigData();
        filteredData = stigData.rows || [];
      }
    } catch (error) {
      console.error('Error getting data from DataManager:', error);
    }
  }
  
  if (!filteredData || filteredData.length === 0) {
    alert('No data to export. Please load a CKLB file first.');
    return;
  }

  // Filter for open items only
  const openItems = filteredData.filter(row => 
    row.status && row.status.toLowerCase() === 'open'
  );

  if (openItems.length === 0) {
    alert('No open findings to export. POAM exports only include items with "Open" status.');
    return;
  }

  const exporter = new ExcelExporter();
  try {
    await exporter.createPOAMExport(openItems, 'POAM_Report');
  } catch (error) {
    console.error('POAM export failed:', error);
    alert('POAM export failed. Please try again.');
  }
}

// Global function to export current POAMs + Milestones to Excel/CSV (used by POAMs page button)
async function exportPOAMsToExcel() {
  try {
    const dataManager = (window.AppState && AppState.state && AppState.state.dataManager)
      ? AppState.state.dataManager
      : window.DataManager;

    if (!dataManager) {
      alert('Data manager not available.');
      return;
    }

    if (typeof dataManager.restoreFromStorage === 'function') {
      dataManager.restoreFromStorage();
    }

    const poams = await (dataManager.getPOAMs ? dataManager.getPOAMs() : (dataManager.currentData?.poams || []));
    const milestones = await (dataManager.getMilestones ? dataManager.getMilestones() : (dataManager.currentData?.milestones || []));

    if (!poams || poams.length === 0) {
      alert('No POAMs to export.');
      return;
    }

    const exporter = new ExcelExporter();
    const res = await exporter.exportPOAMsWithMilestones(poams, milestones, 'POAMs');
    if (!res || res.success !== true) {
      alert('Export may have failed. Please check console.');
    }
  } catch (err) {
    console.error('POAMs export failed:', err);
    alert('POAMs export failed: ' + err.message);
  }
}
