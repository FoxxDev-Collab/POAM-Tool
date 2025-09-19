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
            rule['NIST SP 800-53'],
            rule['NIST_800_53'],
            rule.mappings?.nist,
            rule.references?.nist,
            rule.references?.nist_sp_800_53,
            rule.references?.nist80053,
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
                const creator = (ref.getAttribute('creator') || '').toUpperCase();
                const isNistRef = /NIST/.test(creator) || /800-53/.test(creator);
                if (!isNistRef) continue;

                // Check multiple possible fields: index, title, text content
                const candidates = [
                    ref.getAttribute('index'),
                    ref.getAttribute('title'),
                    ref.textContent
                ].filter(Boolean);

                for (const cand of candidates) {
                    // Find all potential controls in the string
                    const matches = String(cand).match(nistRegex) || [];
                    for (const m of matches) {
                        const ctrl = cleanControl(m);
                        if (ctrl) nistControls.add(ctrl);
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
        // Fallback to DataManager's persisted CCI mappings if custom map isn't provided
        const dmMap = (window.DataManager && window.DataManager.currentData && window.DataManager.currentData.cciMappings)
            ? window.DataManager.currentData.cciMappings
            : {};
        const activeMap = customCciMap || dmMap || {};
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
                // Accept CCIs as array or delimited string
                let ccis = [];
                if (Array.isArray(rule.ccis)) {
                    ccis = rule.ccis.slice();
                } else if (typeof rule.ccis === 'string') {
                    ccis = rule.ccis.split(/[;,\s]+/).map(s => s.trim()).filter(Boolean);
                } else if (Array.isArray(rule.cci_refs)) {
                    ccis = rule.cci_refs.slice();
                } else if (typeof rule.cci_refs === 'string') {
                    ccis = rule.cci_refs.split(/[;,\s]+/).map(s => s.trim()).filter(Boolean);
                }
                
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
            // Parse JSON format
            const json = JSON.parse(text);
            
            // Check if this is an exported mapping file (has vulnerabilities array)
            if (json.vulnerabilities && Array.isArray(json.vulnerabilities)) {
                // Handle exported mapping format - convert to standard row format
                const rows = json.vulnerabilities.map(vuln => ({
                    group_id: vuln.vulnId || vuln.id || '',
                    rule_id: vuln.ruleId || '',
                    rule_version: vuln.ruleVersion || '',
                    rule_title: vuln.title || '',
                    severity: vuln.severity || '',
                    weight: 0,
                    class: '',
                    stig_name: vuln.stigName || '',
                    stig_id: '',
                    stig_version: '',
                    status: vuln.status || '',
                    finding_details: vuln.findingDetails || '',
                    comments: '',
                    discussion: vuln.discussion || '',
                    checkContent: vuln.checkContent || '',
                    fixText: vuln.fixText || '',
                    ccis: Array.isArray(vuln.ccis) ? vuln.ccis : [],
                    nistControls: Array.isArray(vuln.nistControls) ? vuln.nistControls : [],
                    families: Array.isArray(vuln.families) ? vuln.families : [],
                    searchableText: buildSearchBlob({
                        rule_title: vuln.title,
                        discussion: vuln.discussion,
                        check_content: vuln.checkContent,
                        fix_text: vuln.fixText,
                        finding_details: vuln.findingDetails
                    }, vuln.stigName)
                }));
                
                return {
                    type: 'EXPORTED_MAPPINGS',
                    rows: rows
                };
            } else {
                // Handle standard CKLB JSON format
                return {
                    type: 'CKLB',
                    rows: normalizeRows(json, customCciMap)
                };
            }
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
        
        // Extract all STIG_DATA attributes and collect all CCI references
        const allCciReferences = [];
        
        stigDataElements.forEach(data => {
            const attr = data.querySelector('VULN_ATTRIBUTE')?.textContent?.trim();
            const value = data.querySelector('ATTRIBUTE_DATA')?.textContent?.trim();
            
            if (attr && value !== undefined) {
                stigData[attr] = value;
                
                // Check for CCI references in various attribute names (case-insensitive)
                const attrLower = attr.toLowerCase();
                if (attrLower === 'cci_ref' || attrLower === 'cci_refs' || attrLower === 'cci' || attrLower === 'ccis') {
                    allCciReferences.push(value);
                }
            }
        });
        
        // Extract status and comments
        const status = vuln.querySelector('STATUS')?.textContent?.trim() || 'Not_Reviewed';
        const findingDetails = vuln.querySelector('FINDING_DETAILS')?.textContent?.trim() || '';
        const comments = vuln.querySelector('COMMENTS')?.textContent?.trim() || '';
        
        // Collect all CCI references from multiple sources
        const cciSources = [
            // From STIG_DATA attributes (collected above)
            ...allCciReferences,
            // From direct CCI_REF nodes under VULN
            ...Array.from(vuln.querySelectorAll('CCI_REF')).map(n => n.textContent?.trim()).filter(Boolean),
            // From any nested CCI_REF nodes (more comprehensive search)
            ...Array.from(vuln.querySelectorAll('*')).filter(el => el.tagName === 'CCI_REF').map(n => n.textContent?.trim()).filter(Boolean),
            // Check for CCIs in the text content of various fields
            ...(stigData.CCI_REF ? [stigData.CCI_REF] : []),
            ...(stigData.CCI_REFS ? [stigData.CCI_REFS] : []),
            ...(stigData.CCI ? [stigData.CCI] : []),
            ...(stigData.CCIS ? [stigData.CCIS] : [])
        ];
        
        // Split delimited strings and normalize all CCI references
        const allCciRaw = cciSources
            .filter(Boolean)
            .flatMap(s => {
                const str = String(s).trim();
                // Split on various delimiters and clean up
                return str.split(/[;:,\s\n\r\t]+/)
                    .map(cci => cci.trim())
                    .filter(cci => cci && (cci.startsWith('CCI-') || /^\d{6}$/.test(cci)))
                    .map(cci => cci.startsWith('CCI-') ? cci : `CCI-${cci.padStart(6, '0')}`);
            });
        
        const uniqueCcis = Array.from(new Set(allCciRaw));

        // Debug logging for problematic rules
        const problemRules = ['V-258034', 'V-258035', 'V-258036'];
        const vulnId = stigData.Vuln_Num || '';
        if (problemRules.includes(vulnId)) {
            console.log(`[CKL DEBUG] Processing rule ${vulnId}:`, {
                vulnId,
                stigDataKeys: Object.keys(stigData),
                cciSources: cciSources.filter(Boolean),
                allCciRaw,
                uniqueCcis,
                stigData_CCI_REF: stigData.CCI_REF,
                allCciReferences
            });
        }

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
            ccis: uniqueCcis,
            cci_refs: uniqueCcis,
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
        
        // Map CCIs to NIST controls using provided map or DataManager fallback
        if (row.cci_refs.length > 0) {
            const mappedFromCci = mapCcisToNist(row.cci_refs, customCciMap);
            row.nistControls = Array.from(new Set([...row.nistControls, ...mappedFromCci]));
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