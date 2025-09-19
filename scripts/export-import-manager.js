/* Export/Import Manager for CCI/STIG Mappings and POAM Data
   - Exports CCI/STIG mappings to local file system
   - Handles import of exported mapping files for POAM creation
   - Maintains data consistency across export/import cycle
   - Supports local /data drive exports and browser downloads
*/

class ExportImportManager {
    constructor() {
        this.supportedFormats = ['json', 'csv', 'xlsx'];
        this.exportPath = '/data'; // Target local drive path
    }

    // Export CCI/STIG mappings with comprehensive data
    async exportCciStigMappings(dataManager, options = {}) {
        try {
            const {
                format = 'json',
                filename = null,
                includeMetadata = true,
                includePoams = false
            } = options;

            // Gather all data
            const stigRows = await dataManager.getAllStigRows();
            const cciMappings = await dataManager.getCciMappings();
            const poams = includePoams ? await dataManager.getPOAMs() : [];
            const stats = await dataManager.getDataStats();

            if (stigRows.length === 0) {
                throw new Error('No STIG data available to export');
            }

            // Create comprehensive export data
            const exportData = {
                metadata: {
                    exportType: 'cci-stig-mappings',
                    version: '1.0',
                    exportedAt: new Date().toISOString(),
                    exportedBy: 'Cybersecurity Management Suite',
                    totalVulnerabilities: stigRows.length,
                    totalCciMappings: Object.keys(cciMappings).length,
                    totalPoams: poams.length,
                    stats: stats,
                    note: 'This file contains CCI/STIG mappings that can be imported into the POAM module'
                },
                vulnerabilities: stigRows.map(row => ({
                    id: row.id || row.group_id,
                    vulnId: row.group_id,
                    ruleId: row.rule_id,
                    ruleVersion: row.rule_version,
                    title: row.rule_title,
                    severity: row.severity,
                    status: row.status,
                    stigName: row.stig_name,
                    nistControls: row.nistControls || [],
                    ccis: row.ccis || [],
                    families: row.families || [],
                    discussion: row.discussion || '',
                    checkContent: row.checkContent || '',
                    fixText: row.fixText || '',
                    findingDetails: row.finding_details || '',
                    exportedAt: new Date().toISOString()
                })),
                cciMappings: cciMappings,
                poams: includePoams ? poams : [],
                exportSettings: {
                    format: format,
                    includeMetadata: includeMetadata,
                    includePoams: includePoams
                }
            };

            // Generate filename if not provided
            const timestamp = new Date().toISOString().split('T')[0];
            const defaultFilename = `cci-stig-mappings-${timestamp}`;
            const finalFilename = filename || defaultFilename;

            // Export based on format
            switch (format.toLowerCase()) {
                case 'json':
                    return await this.exportAsJson(exportData, finalFilename);
                case 'csv':
                    return await this.exportAsCsv(exportData, finalFilename);
                case 'xlsx':
                    return await this.exportAsExcel(exportData, finalFilename);
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

        } catch (error) {
            console.error('[ExportImportManager] Export failed:', error);
            throw error;
        }
    }

    // Export as JSON format (primary format for re-import)
    async exportAsJson(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Try to save to /data drive if possible (local file system)
        const savedPath = await this.saveToLocalDrive(blob, `${filename}.json`);

        // Also provide browser download as fallback
        this.downloadFile(blob, `${filename}.json`);

        return {
            success: true,
            format: 'json',
            filename: `${filename}.json`,
            localPath: savedPath,
            downloadedToBrowser: true,
            recordCount: data.vulnerabilities.length,
            size: jsonString.length
        };
    }

    // Export as CSV format
    async exportAsCsv(data, filename) {
        const csvContent = this.convertToCsv(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // Try to save to /data drive if possible
        const savedPath = await this.saveToLocalDrive(blob, `${filename}.csv`);

        // Browser download as fallback
        this.downloadFile(blob, `${filename}.csv`);

        return {
            success: true,
            format: 'csv',
            filename: `${filename}.csv`,
            localPath: savedPath,
            downloadedToBrowser: true,
            recordCount: data.vulnerabilities.length,
            size: csvContent.length
        };
    }

    // Export as Excel format
    async exportAsExcel(data, filename) {
        // Use existing Excel exporter
        if (window.ExcelExporter) {
            const exporter = new ExcelExporter();
            await exporter.createWorkbook(data.vulnerabilities, filename);

            return {
                success: true,
                format: 'xlsx',
                filename: `${filename}.xlsx`,
                localPath: null, // Excel exporter handles its own download
                downloadedToBrowser: true,
                recordCount: data.vulnerabilities.length
            };
        } else {
            throw new Error('Excel exporter not available');
        }
    }

    // Convert data to CSV format
    convertToCsv(data) {
        const headers = [
            'Vulnerability ID',
            'Rule ID',
            'Title',
            'Severity',
            'Status',
            'STIG Name',
            'NIST Controls',
            'CCIs',
            'Families',
            'Discussion',
            'Check Content',
            'Fix Text',
            'Export Date'
        ];

        const rows = [headers];

        data.vulnerabilities.forEach(vuln => {
            rows.push([
                vuln.vulnId || '',
                vuln.ruleId || '',
                vuln.title || '',
                vuln.severity || '',
                vuln.status || '',
                vuln.stigName || '',
                (vuln.nistControls || []).join('; '),
                (vuln.ccis || []).join('; '),
                (vuln.families || []).join('; '),
                this.escapeCsvContent(vuln.discussion || ''),
                this.escapeCsvContent(vuln.checkContent || ''),
                this.escapeCsvContent(vuln.fixText || ''),
                vuln.exportedAt || ''
            ]);
        });

        return rows.map(row => {
            return row.map(cell => {
                const cellStr = String(cell || '');
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return '"' + cellStr.replace(/"/g, '""') + '"';
                }
                return cellStr;
            }).join(',');
        }).join('\n');
    }

    // Escape CSV content
    escapeCsvContent(content) {
        if (!content) return '';
        return content.replace(/\r\n/g, '\n')
                     .replace(/\r/g, '\n')
                     .replace(/\n{3,}/g, '\n\n')
                     .trim();
    }

    // Attempt to save to local /data drive (may not work in all environments)
    async saveToLocalDrive(blob, filename) {
        try {
            // Try to use File System Access API if available (modern browsers)
            if ('showSaveFilePicker' in window) {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    startIn: 'downloads',
                    types: [{
                        description: 'Data files',
                        accept: {
                            'application/json': ['.json'],
                            'text/csv': ['.csv'],
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
                        }
                    }]
                });

                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();

                return fileHandle.name;
            }
        } catch (error) {
            console.log('[ExportImportManager] Local drive save not available:', error.message);
        }

        return null;
    }

    // Download file via browser
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Import CCI/STIG mappings for POAM creation
    async importForPoamCreation(file, dataManager) {
        try {
            const fileContent = await file.text();
            let importData;

            // Parse based on file extension
            if (file.name.endsWith('.json')) {
                importData = JSON.parse(fileContent);
            } else if (file.name.endsWith('.csv')) {
                importData = await this.parseCsvImport(fileContent);
            } else {
                throw new Error('Unsupported file format. Please use JSON or CSV files.');
            }

            // Validate import data structure
            if (!this.validateImportData(importData)) {
                throw new Error('Invalid import file structure. Please use a file exported from this application.');
            }

            // Process vulnerabilities for POAM creation
            const vulnerabilities = importData.vulnerabilities || [];
            const processedVulns = vulnerabilities.map(vuln => ({
                ...vuln,
                importedAt: new Date().toISOString(),
                availableForPoam: this.determinePoamEligibility(vuln)
            }));

            // Load data into the data manager
            if (dataManager.loadImportedData) {
                await dataManager.loadImportedData(importData);
            }

            return {
                success: true,
                totalVulnerabilities: processedVulns.length,
                eligibleForPoam: processedVulns.filter(v => v.availableForPoam).length,
                metadata: importData.metadata || {},
                vulnerabilities: processedVulns
            };

        } catch (error) {
            console.error('[ExportImportManager] Import failed:', error);
            throw new Error(`Import failed: ${error.message}`);
        }
    }

    // Parse CSV import data
    async parseCsvImport(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim());
        const headers = this.parseCsvLine(lines[0]);

        const vulnerabilities = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCsvLine(lines[i]);
            if (values.length >= headers.length) {
                const vuln = {};
                headers.forEach((header, index) => {
                    const key = this.csvHeaderToKey(header);
                    vuln[key] = values[index] || '';
                });
                vulnerabilities.push(vuln);
            }
        }

        return {
            metadata: {
                exportType: 'cci-stig-mappings',
                version: '1.0',
                importedAt: new Date().toISOString(),
                totalVulnerabilities: vulnerabilities.length
            },
            vulnerabilities: vulnerabilities
        };
    }

    // Parse CSV line handling quoted content
    parseCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"' && inQuotes && nextChar === '"') {
                current += '"';
                i++; // Skip next quote
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    // Convert CSV header to object key
    csvHeaderToKey(header) {
        const mapping = {
            'Vulnerability ID': 'vulnId',
            'Rule ID': 'ruleId',
            'Title': 'title',
            'Severity': 'severity',
            'Status': 'status',
            'STIG Name': 'stigName',
            'NIST Controls': 'nistControls',
            'CCIs': 'ccis',
            'Families': 'families',
            'Discussion': 'discussion',
            'Check Content': 'checkContent',
            'Fix Text': 'fixText',
            'Export Date': 'exportedAt'
        };

        return mapping[header] || header.toLowerCase().replace(/\s+/g, '_');
    }

    // Validate import data structure
    validateImportData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!data.metadata || !data.vulnerabilities) return false;
        if (!Array.isArray(data.vulnerabilities)) return false;
        if (data.metadata.exportType !== 'cci-stig-mappings') return false;

        return true;
    }

    // Determine if vulnerability is eligible for POAM creation
    determinePoamEligibility(vulnerability) {
        // Eligible if status indicates an issue that needs remediation
        const eligibleStatuses = ['open', 'failed', 'not_reviewed'];
        return eligibleStatuses.includes(vulnerability.status?.toLowerCase());
    }

    // Create POAM from imported vulnerability data
    createPoamFromVulnerability(vulnerability, additionalData = {}) {
        return {
            vulnId: vulnerability.vulnId || vulnerability.id,
            title: vulnerability.title || 'Imported Vulnerability',
            severity: vulnerability.severity || 'medium',
            status: 'open',
            nistControls: Array.isArray(vulnerability.nistControls)
                ? vulnerability.nistControls.join(', ')
                : vulnerability.nistControls || '',
            ccis: Array.isArray(vulnerability.ccis)
                ? vulnerability.ccis.join(', ')
                : vulnerability.ccis || '',
            description: vulnerability.discussion || '',
            fixText: vulnerability.fixText || '',
            checkContent: vulnerability.checkContent || '',
            stigName: vulnerability.stigName || '',
            importedFrom: vulnerability.exportedAt || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...additionalData
        };
    }

    // Batch create POAMs from multiple vulnerabilities
    async batchCreatePoamsFromImport(vulnerabilities, dataManager, statusCallback = null) {
        const results = {
            total: vulnerabilities.length,
            created: 0,
            skipped: 0,
            errors: []
        };

        for (let i = 0; i < vulnerabilities.length; i++) {
            const vuln = vulnerabilities[i];

            try {
                if (statusCallback) {
                    statusCallback({
                        current: i + 1,
                        total: vulnerabilities.length,
                        vulnerability: vuln.title || vuln.vulnId
                    });
                }

                // Check if POAM already exists
                const existingPoams = await dataManager.getPOAMs();
                const exists = existingPoams.some(poam => poam.vulnId === vuln.vulnId);

                if (exists) {
                    results.skipped++;
                    continue;
                }

                // Create POAM
                const poamData = this.createPoamFromVulnerability(vuln);
                await dataManager.addPoamToData(poamData);
                results.created++;

            } catch (error) {
                results.errors.push({
                    vulnerability: vuln.vulnId || vuln.id,
                    error: error.message
                });
            }
        }

        return results;
    }
}

// Make available globally
window.ExportImportManager = ExportImportManager;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportImportManager;
}