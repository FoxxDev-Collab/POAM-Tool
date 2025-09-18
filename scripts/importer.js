/* File Import and Processing Module
   - Handles CKLB JSON and CKL XML file processing
   - Parses CCI XML mappings
   - Normalizes data from different formats
   - Provides unified interface for file importing
*/

// Import and export utilities
const FileImporter = (() => {
    // Heuristic for NIST 800-53 control identifiers (e.g., AC-2, IA-5(1))
    const nistRegex = /\b(AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PL|PM|PS|RA|SA|SC|SI|SR|PT|SE|AR|IP|TR|DM|RS|RC)\s*-\s*\d+[A-Za-z]?(?:\s*\([0-9a-z]+\))?(?:\s*[a-z])?\b/gi;

    function readExplicitNist(rule) {
        const candidates = [
            rule.nist,
            rule.nist_controls,
            rule.nistControls,
            rule.NIST,
            rule.mappings?.nist,
            rule.references?.nist,
        ].filter(Boolean);

        const list = new Set();
        for (const c of candidates) {
            if (Array.isArray(c)) {
                c.forEach(x => typeof x === 'string' && list.add(cleanControl(x)));
            } else if (typeof c === 'string') {
                c.split(/[;,|]/).map(s => s.trim()).filter(Boolean).forEach(x => list.add(cleanControl(x)));
            }
        }
        return Array.from(list).filter(Boolean);
    }

    function cleanControl(ctrl) {
        if (!ctrl) return '';
        let s = String(ctrl).toUpperCase().trim();
        s = s.replace(/\s*-\s*/g, '-');
        s = s.replace(/\s*\(\s*/g, '(').replace(/\s*\)\s*/g, ')');
        s = s.replace(/\s+/g, ' ');
        s = s.replace(/-\s+(\d)/, '-$1').replace(/\s+\(/g, '(');
        const m = s.match(/^(AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PL|PM|PS|RA|SA|SC|SI|SR|PT|SE|AR|IP|TR|DM|RS|RC)-\d+[A-Z]?(?:\([0-9a-zA-Z]+\))?(?:\s*[A-Z])?$/);
        return m ? s : '';
    }

    function extractNistFromText(rule) {
        const textParts = [
            rule.rule_title,
            rule.discussion,
            rule.check_content,
            rule.fix_text,
            rule.group_title,
            rule.finding_details,
            rule.comments,
        ].filter(Boolean);
        const text = textParts.join('\n');
        const matches = text.match(nistRegex) || [];
        const normalized = matches.map(m => cleanControl(m)).filter(Boolean);
        return Array.from(new Set(normalized));
    }

    function deriveFamily(ctrl) {
        const m = ctrl ? ctrl.match(/^[A-Z]{2,3}(?=-)/) : null;
        return m ? m[0] : '';
    }

    function parseCciXml(xmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'application/xml');
        const cciItems = doc.querySelectorAll('cci_item');
        const mapping = {};
        
        for (const item of cciItems) {
            const cciId = item.getAttribute('id');
            if (!cciId) continue;
            
            const references = item.querySelectorAll('reference');
            const nistControls = new Set();
            
            for (const ref of references) {
                if (ref.getAttribute('creator') === 'NIST') {
                    const index = ref.getAttribute('index');
                    if (index) {
                        // Extract NIST control from index (e.g., "AC-2 e" -> "AC-2")
                        const match = index.match(/^([A-Z]{2,3}-\d+(?:\s*\([^)]+\))?)/);
                        if (match) {
                            nistControls.add(cleanControl(match[1]));
                        }
                    }
                }
            }
            
            if (nistControls.size > 0) {
                mapping[cciId] = Array.from(nistControls);
            }
        }
        
        console.log(`Parsed CCI XML: ${Object.keys(mapping).length} CCIs mapped to NIST controls`);
        return mapping;
    }

    function mapCcisToNist(ccis, customCciMap = null) {
        const activeMap = customCciMap || {};
        const nistControls = new Set();
        for (const cci of ccis) {
            const mapped = activeMap[cci];
            if (mapped) {
                mapped.forEach(ctrl => nistControls.add(ctrl));
            }
        }
        return Array.from(nistControls).sort();
    }

    function normalizeRows(json, customCciMap = null) {
        const rows = [];
        const stigs = Array.isArray(json?.stigs) ? json.stigs : [];
        for (const stig of stigs) {
            const stigName = stig.display_name || stig.stig_name || stig.stig_id || 'Unknown STIG';
            const rules = Array.isArray(stig.rules) ? stig.rules : [];
            for (const rule of rules) {
                const ccis = Array.isArray(rule.ccis) ? rule.ccis.slice() : [];
                
                // Try multiple approaches to get NIST controls
                const explicit = readExplicitNist(rule);
                const fromCcis = mapCcisToNist(ccis, customCciMap);
                const heuristic = (explicit.length === 0 && fromCcis.length === 0) ? extractNistFromText(rule) : [];
                
                // Combine all sources, prioritizing explicit > CCI mapping > heuristic
                const allNist = new Set([...explicit, ...fromCcis, ...heuristic]);
                const nistControls = Array.from(allNist).sort();
                const families = Array.from(new Set(nistControls.map(deriveFamily).filter(Boolean))).sort();

                const row = {
                    nistControls: nistControls,
                    families: families,
                    ccis: ccis,
                    group_id: rule.group_id,
                    rule_id: rule.rule_id,
                    rule_version: rule.rule_version,
                    rule_title: rule.rule_title,
                    severity: rule.severity || 'unknown',
                    status: rule.status || 'not_reviewed',
                    stig_name: stig.stig_name || stig.display_name,
                    discussion: rule.discussion,
                    checkContent: rule.check_content,
                    fixText: rule.fix_text
                };

                // Build search blob
                row.searchableText = buildSearchBlob(rule, stigName);
                rows.push(row);
            }
        }
        return rows;
    }

    function buildSearchBlob(rule, stigName) {
        const fields = [
            stigName,
            rule.group_id,
            rule.rule_id,
            rule.rule_version,
            rule.rule_title,
            rule.severity,
            rule.status,
            (Array.isArray(rule.ccis) ? rule.ccis.join(' ') : ''),
            rule.group_title,
            rule.discussion,
            rule.check_content,
            rule.fix_text,
            rule.finding_details,
            rule.comments,
        ].filter(Boolean);
        return fields.join(' ').toLowerCase();
    }

    async function processFile(file, customCciMap = null) {
        const text = await file.text();
        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith('.json') || fileName.endsWith('.cklb')) {
            // Parse CKLB JSON format
            const json = JSON.parse(text);
            return {
                type: 'CKLB',
                rows: normalizeRows(json, customCciMap)
            };
        } else if (fileName.endsWith('.ckl') || fileName.endsWith('.xml')) {
            // Parse CKL XML format
            const rows = parseCklXml(text, customCciMap);
            return {
                type: 'CKL',
                rows: rows
            };
        } else {
            throw new Error(`Unsupported file type: ${file.name}`);
        }
    }

    function parseCklXml(xmlText, customCciMap = null) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'application/xml');
        
        // Check for parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
            throw new Error('Invalid XML format');
        }
        
        const rows = [];
        
        // Process each iSTIG section separately
        const iStigs = doc.querySelectorAll('iSTIG');
        
        iStigs.forEach((iStig, stigIndex) => {
            // Extract STIG info for this specific iSTIG
            const stigInfo = extractStigInfoFromiSTIG(iStig);
            
            // Get all VULNs within this iSTIG
            const vulns = iStig.querySelectorAll('VULN');
            
            vulns.forEach(vuln => {
                const row = parseCklVuln(vuln, stigInfo, customCciMap);
                if (row) {
                    // Add STIG index for debugging/tracking
                    row.stig_index = stigIndex;
                    rows.push(row);
                }
            });
        });
        
        return rows;
    }

    function extractStigInfo(doc) {
        const stigInfo = {};
        const siDataElements = doc.querySelectorAll('STIG_INFO SI_DATA');
        
        siDataElements.forEach(siData => {
            const sidName = siData.querySelector('SID_NAME')?.textContent?.trim();
            const sidData = siData.querySelector('SID_DATA')?.textContent?.trim();
            
            if (sidName && sidData) {
                stigInfo[sidName] = sidData;
            }
        });
        
        return stigInfo;
    }

    function extractStigInfoFromiSTIG(iStig) {
        const stigInfo = {};
        const siDataElements = iStig.querySelectorAll('STIG_INFO SI_DATA');
        
        siDataElements.forEach(siData => {
            const sidName = siData.querySelector('SID_NAME')?.textContent?.trim();
            const sidData = siData.querySelector('SID_DATA')?.textContent?.trim();
            
            if (sidName && sidData) {
                stigInfo[sidName] = sidData;
            }
        });
        
        return stigInfo;
    }

    function parseCklVuln(vuln, stigInfo, customCciMap = null) {
        const stigData = {};
        const stigDataElements = vuln.querySelectorAll('STIG_DATA');
        
        // Extract all STIG_DATA attributes
        stigDataElements.forEach(data => {
            const attr = data.querySelector('VULN_ATTRIBUTE')?.textContent?.trim();
            const value = data.querySelector('ATTRIBUTE_DATA')?.textContent?.trim();
            
            if (attr && value !== undefined) {
                stigData[attr] = value;
            }
        });
        
        // Extract status and comments
        const status = vuln.querySelector('STATUS')?.textContent?.trim() || 'Not_Reviewed';
        const findingDetails = vuln.querySelector('FINDING_DETAILS')?.textContent?.trim() || '';
        const comments = vuln.querySelector('COMMENTS')?.textContent?.trim() || '';
        
        // Map CKL format to normalized format
        const row = {
            group_id: stigData.Vuln_Num || '',
            rule_id: stigData.Rule_ID || '',
            rule_version: stigData.Rule_Ver || '',
            rule_title: stigData.Rule_Title || '',
            severity: stigData.Severity || '',
            weight: parseFloat(stigData.Weight) || 0,
            class: stigData.Class || '',
            stig_name: stigInfo.title || stigInfo.stigid || 'Unknown STIG',
            stig_id: stigInfo.stigid || '',
            stig_version: stigInfo.version || '',
            stig_release: stigInfo.releaseinfo || '',
            group_title: stigData.Group_Title || '',
            discussion: stigData.Vuln_Discuss || '',
            checkContent: stigData.Check_Content || '',
            fixText: stigData.Fix_Text || '',
            check_content: stigData.Check_Content || '', // Alternative naming
            fix_text: stigData.Fix_Text || '', // Alternative naming
            status: status.toLowerCase().replace(/\s+/g, '_'),
            finding_details: findingDetails,
            comments: comments,
            ccis: stigData.CCI_REF ? [stigData.CCI_REF] : [], // Expected by renderTable
            cci_refs: stigData.CCI_REF ? [stigData.CCI_REF] : [],
            ia_controls: stigData.IA_Controls || '',
            legacy_ids: [],
            stig_uuid: stigData.STIG_UUID || '',
            target_key: stigData.TargetKey || '',
            nistControls: [], // Will be populated below
            families: [] // Will be populated below
        };
        
        // Extract NIST controls
        const explicitNist = readExplicitNist(row);
        const textNist = extractNistFromText(row);
        const allNist = Array.from(new Set([...explicitNist, ...textNist]));
        
        row.nistControls = allNist;
        row.families = Array.from(new Set(allNist.map(deriveFamily).filter(Boolean)));
        
        // Map CCIs to NIST controls if available
        if (customCciMap && row.cci_refs.length > 0) {
            const cciNist = row.cci_refs.flatMap(cci => customCciMap[cci] || []);
            row.nistControls = Array.from(new Set([...row.nistControls, ...cciNist]));
            row.families = Array.from(new Set(row.nistControls.map(deriveFamily).filter(Boolean)));
        }
        
        // Build search blob
        row.searchableText = buildSearchBlob(row, row.stig_name);
        
        return row;
    }

    // Public API
    return {
        processFile,
        parseCciXml,
        mapCcisToNist,
        normalizeRows,
        buildSearchBlob,
        parseCklXml,
        extractStigInfo,
        extractStigInfoFromiSTIG,
        parseCklVuln,
        readExplicitNist,
        cleanControl,
        extractNistFromText,
        deriveFamily
    };
})();

// Make available globally
window.FileImporter = FileImporter;