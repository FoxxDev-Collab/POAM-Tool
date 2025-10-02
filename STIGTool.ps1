<#
.SYNOPSIS
    STIG Analysis Tool - Professional Windows GUI
    
.DESCRIPTION
    Professional STIG analysis tool with Windows Forms GUI.
    - Import CCI mappings from U_CCI_List.xml
    - Import STIG CKL/CKLB files
    - Export to Excel 2016 format
    - 100% air-gapped compatible (no external dependencies)
    
.NOTES
    Requirements: Windows 10, PowerShell 5.1+, Microsoft Office 2016+
    Air-gapped: Uses only built-in Windows Forms and Excel COM objects
    Version: 2.0
    Author: STIG Analysis Tool
#>

#Requires -Version 5.1

[CmdletBinding()]
param()

# Add required assemblies
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Script configuration
$ErrorActionPreference = 'Stop'
$script:VulnerabilityData = @()
$script:CciMappings = @{}
$script:LoadedFiles = @()

#region Classes

class Vulnerability {
    [string]$GroupId
    [string]$RuleId
    [string]$RuleVersion
    [string]$RuleTitle
    [string]$Severity
    [string]$Status
    [string]$StigName
    [string[]]$CCIs
    [string[]]$NistControls
    [string[]]$Families
    [string]$Discussion
    [string]$CheckContent
    [string]$FixText
    [string]$FindingDetails
    [string]$Comments
    [string]$SourceFile
}

#endregion

#region CCI XML Parser

function Import-CciMappings {
    param([string]$XmlPath)
    
    try {
        [xml]$cciXml = Get-Content -Path $XmlPath -Raw
        $mappings = @{}
        $count = 0
        
        # Handle XML namespace
        $ns = New-Object System.Xml.XmlNamespaceManager($cciXml.NameTable)
        $ns.AddNamespace("cci", "http://iase.disa.mil/cci")
        
        $cciItems = $cciXml.SelectNodes("//cci:cci_item", $ns)
        
        foreach ($cciItem in $cciItems) {
            $cciId = $cciItem.GetAttribute("id")
            $nistControls = @()
            
            $references = $cciItem.SelectNodes("cci:references/cci:reference", $ns)
            foreach ($reference in $references) {
                $title = $reference.GetAttribute("title")
                $index = $reference.GetAttribute("index")
                
                # Look for NIST 800-53 references
                if ($title -like '*800-53*' -and $index) {
                    $nistControls += $index
                }
            }
            
            if ($nistControls.Count -gt 0) {
                $mappings[$cciId] = $nistControls | Select-Object -Unique
                $count++
            }
        }
        
        return @{
            Success = $true
            Mappings = $mappings
            Count = $count
        }
    }
    catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

#endregion

#region STIG File Parsers

function Import-CklFile {
    param(
        [string]$Path,
        [hashtable]$CciMappings
    )
    
    try {
        [xml]$ckl = Get-Content -Path $Path -Raw
        $vulnerabilities = [System.Collections.ArrayList]::new()
        
        $stigName = $ckl.CHECKLIST.STIGS.iSTIG.STIG_INFO.SI_DATA | 
            Where-Object { $_.SID_NAME -eq 'title' } | 
            Select-Object -ExpandProperty SID_DATA
        
        foreach ($vuln in $ckl.CHECKLIST.STIGS.iSTIG.VULN) {
            $v = [Vulnerability]::new()
            
            $v.GroupId = ($vuln.STIG_DATA | Where-Object { $_.VULN_ATTRIBUTE -eq 'Vuln_Num' }).ATTRIBUTE_DATA
            $v.RuleId = ($vuln.STIG_DATA | Where-Object { $_.VULN_ATTRIBUTE -eq 'Rule_ID' }).ATTRIBUTE_DATA
            $v.RuleVersion = ($vuln.STIG_DATA | Where-Object { $_.VULN_ATTRIBUTE -eq 'Rule_Ver' }).ATTRIBUTE_DATA
            $v.RuleTitle = ($vuln.STIG_DATA | Where-Object { $_.VULN_ATTRIBUTE -eq 'Rule_Title' }).ATTRIBUTE_DATA
            $v.Severity = ($vuln.STIG_DATA | Where-Object { $_.VULN_ATTRIBUTE -eq 'Severity' }).ATTRIBUTE_DATA
            $v.Discussion = ($vuln.STIG_DATA | Where-Object { $_.VULN_ATTRIBUTE -eq 'Vuln_Discuss' }).ATTRIBUTE_DATA
            $v.CheckContent = ($vuln.STIG_DATA | Where-Object { $_.VULN_ATTRIBUTE -eq 'Check_Content' }).ATTRIBUTE_DATA
            $v.FixText = ($vuln.STIG_DATA | Where-Object { $_.VULN_ATTRIBUTE -eq 'Fix_Text' }).ATTRIBUTE_DATA.'#text'
            
            $cciString = ($vuln.STIG_DATA | Where-Object { $_.VULN_ATTRIBUTE -eq 'CCI_REF' }).ATTRIBUTE_DATA
            if ($cciString) {
                $v.CCIs = $cciString -split '\s+' | Where-Object { $_ }
            } else {
                $v.CCIs = @()
            }
            
            $nistControls = [System.Collections.Generic.HashSet[string]]::new()
            $families = [System.Collections.Generic.HashSet[string]]::new()
            
            foreach ($cci in $v.CCIs) {
                if ($CciMappings.ContainsKey($cci)) {
                    foreach ($control in $CciMappings[$cci]) {
                        [void]$nistControls.Add($control)
                        if ($control -match '^([A-Z]{2,3})-') {
                            [void]$families.Add($matches[1])
                        }
                    }
                }
            }
            
            $v.NistControls = @($nistControls)
            $v.Families = @($families)
            $v.Status = $vuln.STATUS
            $v.FindingDetails = $vuln.FINDING_DETAILS
            $v.Comments = $vuln.COMMENTS
            $v.StigName = $stigName
            $v.SourceFile = Split-Path -Path $Path -Leaf
            
            [void]$vulnerabilities.Add($v)
        }
        
        return @{
            Success = $true
            Vulnerabilities = $vulnerabilities
            Count = $vulnerabilities.Count
        }
    }
    catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Import-CklbFile {
    param(
        [string]$Path,
        [hashtable]$CciMappings
    )
    
    try {
        $jsonContent = Get-Content -Path $Path -Raw | ConvertFrom-Json
        $vulnerabilities = [System.Collections.ArrayList]::new()
        
        $stigName = $jsonContent.title
        
        foreach ($vuln in $jsonContent.stigs.rules) {
            $v = [Vulnerability]::new()
            
            $v.GroupId = $vuln.group_id
            $v.RuleId = $vuln.rule_id
            $v.RuleVersion = $vuln.rule_version
            $v.RuleTitle = $vuln.rule_title
            $v.Severity = $vuln.severity
            $v.Discussion = $vuln.discussion
            $v.CheckContent = $vuln.check_content
            $v.FixText = $vuln.fix_text
            
            if ($vuln.cci) {
                $v.CCIs = @($vuln.cci)
            } else {
                $v.CCIs = @()
            }
            
            $nistControls = [System.Collections.Generic.HashSet[string]]::new()
            $families = [System.Collections.Generic.HashSet[string]]::new()
            
            foreach ($cci in $v.CCIs) {
                if ($CciMappings.ContainsKey($cci)) {
                    foreach ($control in $CciMappings[$cci]) {
                        [void]$nistControls.Add($control)
                        if ($control -match '^([A-Z]{2,3})-') {
                            [void]$families.Add($matches[1])
                        }
                    }
                }
            }
            
            $v.NistControls = @($nistControls)
            $v.Families = @($families)
            $v.Status = $vuln.status
            $v.FindingDetails = $vuln.finding_details
            $v.Comments = $vuln.comments
            $v.StigName = $stigName
            $v.SourceFile = Split-Path -Path $Path -Leaf
            
            [void]$vulnerabilities.Add($v)
        }
        
        return @{
            Success = $true
            Vulnerabilities = $vulnerabilities
            Count = $vulnerabilities.Count
        }
    }
    catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

#endregion

#region Excel Export

function Export-ToExcel {
    param(
        [array]$Vulnerabilities,
        [string]$OutputPath
    )
    
    $excel = $null
    $workbook = $null
    $worksheet = $null
    
    try {
        # Create Excel COM object
        $excel = New-Object -ComObject Excel.Application
        $excel.Visible = $false
        $excel.DisplayAlerts = $false
        
        # Create workbook
        $workbook = $excel.Workbooks.Add()
        $worksheet = $workbook.Worksheets.Item(1)
        $worksheet.Name = "STIG Analysis"
        
        # Define headers
        $headers = @(
            'NIST Controls', 'NIST Family', 'CCIs', 'Vuln-ID', 'Rule-ID',
            'Rule Version', 'Title', 'Severity', 'Status', 'STIG Name',
            'Discussion', 'Check Content', 'Fix Text', 'Finding Details',
            'Comments', 'Source File'
        )
        
        # Write headers
        for ($col = 1; $col -le $headers.Count; $col++) {
            $worksheet.Cells.Item(1, $col) = $headers[$col - 1]
        }
        
        # Format header row
        $headerRange = $worksheet.Range($worksheet.Cells.Item(1, 1), $worksheet.Cells.Item(1, $headers.Count))
        $headerRange.Font.Bold = $true
        $headerRange.Font.Size = 12
        $headerRange.Interior.Color = 0x366092  # Dark blue
        $headerRange.Font.Color = 0xFFFFFF      # White
        
        # Write data
        $row = 2
        foreach ($v in $Vulnerabilities) {
            $worksheet.Cells.Item($row, 1) = ($v.NistControls -join ', ')
            $worksheet.Cells.Item($row, 2) = ($v.Families -join ', ')
            $worksheet.Cells.Item($row, 3) = ($v.CCIs -join ', ')
            $worksheet.Cells.Item($row, 4) = $v.GroupId
            $worksheet.Cells.Item($row, 5) = $v.RuleId
            $worksheet.Cells.Item($row, 6) = $v.RuleVersion
            $worksheet.Cells.Item($row, 7) = $v.RuleTitle
            $worksheet.Cells.Item($row, 8) = $v.Severity
            $worksheet.Cells.Item($row, 9) = $v.Status
            $worksheet.Cells.Item($row, 10) = $v.StigName
            $worksheet.Cells.Item($row, 11) = $v.Discussion
            $worksheet.Cells.Item($row, 12) = $v.CheckContent
            $worksheet.Cells.Item($row, 13) = $v.FixText
            $worksheet.Cells.Item($row, 14) = $v.FindingDetails
            $worksheet.Cells.Item($row, 15) = $v.Comments
            $worksheet.Cells.Item($row, 16) = $v.SourceFile
            $row++
        }
        
        # Apply conditional formatting for Severity
        if ($row -gt 2) {
            $severityCol = 8
            $severityRange = $worksheet.Range($worksheet.Cells.Item(2, $severityCol), $worksheet.Cells.Item($row - 1, $severityCol))
            
            # Critical - Red
            $critCond = $severityRange.FormatConditions.Add(1, 3, "=LOWER(H2)=`"critical`"")
            $critCond.Interior.Color = 0xC7C7FF  # Light red
            $critCond.Font.Color = 0x0000CC      # Dark red
            
            # High - Orange
            $highCond = $severityRange.FormatConditions.Add(1, 3, "=LOWER(H2)=`"high`"")
            $highCond.Interior.Color = 0xCCE5FF  # Light orange
            $highCond.Font.Color = 0x0066CC      # Dark orange
            
            # Medium - Yellow
            $medCond = $severityRange.FormatConditions.Add(1, 3, "=LOWER(H2)=`"medium`"")
            $medCond.Interior.Color = 0xCCFFFF   # Light yellow
            $medCond.Font.Color = 0x008000       # Dark yellow/green
            
            # Low - Green
            $lowCond = $severityRange.FormatConditions.Add(1, 3, "=LOWER(H2)=`"low`"")
            $lowCond.Interior.Color = 0xCCFFCC   # Light green
            $lowCond.Font.Color = 0x006600       # Dark green
            
            # Status conditional formatting
            $statusCol = 9
            $statusRange = $worksheet.Range($worksheet.Cells.Item(2, $statusCol), $worksheet.Cells.Item($row - 1, $statusCol))
            
            $openCond = $statusRange.FormatConditions.Add(1, 3, "=I2=`"Open`"")
            $openCond.Interior.Color = 0xC7C7FF
            $openCond.Font.Color = 0x0000CC
            
            $nafCond = $statusRange.FormatConditions.Add(1, 3, "=I2=`"NotAFinding`"")
            $nafCond.Interior.Color = 0xCCFFCC
            $nafCond.Font.Color = 0x006600
            
            $nrCond = $statusRange.FormatConditions.Add(1, 3, "=I2=`"Not_Reviewed`"")
            $nrCond.Interior.Color = 0xFFEECC
            $nrCond.Font.Color = 0x996600
        }
        
        # Auto-fit columns
        if ($worksheet -and $row -gt 1) {
            try {
                $usedRange = $worksheet.UsedRange
                if ($usedRange) {
                    $usedRange.EntireColumn.AutoFit() | Out-Null
                    
                    # Add AutoFilter
                    $usedRange.AutoFilter() | Out-Null
                }
            } catch {
                Write-Verbose "Warning: Could not apply auto-fit or filters: $_"
            }
            
            # Freeze top row
            try {
                if ($worksheet.Application.ActiveWindow) {
                    $worksheet.Application.ActiveWindow.SplitRow = 1
                    $worksheet.Application.ActiveWindow.FreezePanes = $true
                }
            } catch {
                Write-Verbose "Warning: Could not freeze panes: $_"
            }
        }
        
        # Save
        if (-not $workbook) {
            throw "Workbook object is null"
        }
        
        if (Test-Path $OutputPath) {
            Remove-Item -Path $OutputPath -Force
        }
        
        # Convert to full path for Excel
        $fullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
        
        $workbook.SaveAs($fullPath, 51)  # xlOpenXMLWorkbook
        $workbook.Close($false)
        
        return @{
            Success = $true
            Path = $OutputPath
        }
    }
    catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
    finally {
        # Clean up COM objects in proper order
        if ($worksheet) { 
            try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($worksheet) } catch {}
            $worksheet = $null
        }
        if ($workbook) { 
            try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) } catch {}
            $workbook = $null
        }
        if ($excel) {
            try { 
                $excel.Quit() 
                Start-Sleep -Milliseconds 100
            } catch {}
            try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) } catch {}
            $excel = $null
        }
        [System.GC]::Collect()
        [System.GC]::WaitForPendingFinalizers()
        [System.GC]::Collect()
    }
}

#endregion

#region GUI

function Show-MainForm {
    # Create main form with modern styling
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "STIG Analysis Tool v2.0"
    $form.Size = New-Object System.Drawing.Size(1000, 750)
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "FixedSingle"
    $form.MaximizeBox = $true
    $form.BackColor = [System.Drawing.Color]::FromArgb(240, 240, 245)
    $form.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    
    # Status bar at bottom with modern styling
    $statusBar = New-Object System.Windows.Forms.StatusStrip
    $statusBar.BackColor = [System.Drawing.Color]::FromArgb(45, 45, 48)
    $statusLabel = New-Object System.Windows.Forms.ToolStripStatusLabel
    $statusLabel.Text = "Ready"
    $statusLabel.ForeColor = [System.Drawing.Color]::White
    $statusBar.Items.Add($statusLabel) | Out-Null
    $form.Controls.Add($statusBar)
    
    # Header panel with gradient-like effect
    $headerPanel = New-Object System.Windows.Forms.Panel
    $headerPanel.Location = New-Object System.Drawing.Point(0, 0)
    $headerPanel.Size = New-Object System.Drawing.Size(1000, 80)
    $headerPanel.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
    $form.Controls.Add($headerPanel)
    
    # Title label
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Location = New-Object System.Drawing.Point(30, 20)
    $titleLabel.Size = New-Object System.Drawing.Size(700, 40)
    $titleLabel.Text = "STIG to NIST Control Mapper"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = [System.Drawing.Color]::White
    $titleLabel.BackColor = [System.Drawing.Color]::Transparent
    $headerPanel.Controls.Add($titleLabel)
    
    # Subtitle
    $subtitleLabel = New-Object System.Windows.Forms.Label
    $subtitleLabel.Location = New-Object System.Drawing.Point(32, 55)
    $subtitleLabel.Size = New-Object System.Drawing.Size(700, 20)
    $subtitleLabel.Text = "Air-gapped STIG analysis and NIST 800-53 mapping"
    $subtitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $subtitleLabel.ForeColor = [System.Drawing.Color]::FromArgb(220, 220, 220)
    $subtitleLabel.BackColor = [System.Drawing.Color]::Transparent
    $headerPanel.Controls.Add($subtitleLabel)
    
    # Group box for CCI Mappings with modern styling
    $cciGroupBox = New-Object System.Windows.Forms.GroupBox
    $cciGroupBox.Location = New-Object System.Drawing.Point(30, 100)
    $cciGroupBox.Size = New-Object System.Drawing.Size(930, 110)
    $cciGroupBox.Text = " 1. CCI Mappings (U_CCI_List.xml) "
    $cciGroupBox.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $cciGroupBox.ForeColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
    $cciGroupBox.BackColor = [System.Drawing.Color]::White
    $cciGroupBox.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $form.Controls.Add($cciGroupBox)
    
    $cciTextBox = New-Object System.Windows.Forms.TextBox
    $cciTextBox.Location = New-Object System.Drawing.Point(20, 35)
    $cciTextBox.Size = New-Object System.Drawing.Size(720, 23)
    $cciTextBox.ReadOnly = $true
    $cciTextBox.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $cciTextBox.BackColor = [System.Drawing.Color]::FromArgb(250, 250, 250)
    $cciGroupBox.Controls.Add($cciTextBox)
    
    $cciBrowseBtn = New-Object System.Windows.Forms.Button
    $cciBrowseBtn.Location = New-Object System.Drawing.Point(750, 33)
    $cciBrowseBtn.Size = New-Object System.Drawing.Size(160, 30)
    $cciBrowseBtn.Text = "Browse..."
    $cciBrowseBtn.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
    $cciBrowseBtn.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
    $cciBrowseBtn.ForeColor = [System.Drawing.Color]::White
    $cciBrowseBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $cciBrowseBtn.FlatAppearance.BorderSize = 0
    $cciBrowseBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $cciGroupBox.Controls.Add($cciBrowseBtn)
    
    $cciStatusLabel = New-Object System.Windows.Forms.Label
    $cciStatusLabel.Location = New-Object System.Drawing.Point(20, 70)
    $cciStatusLabel.Size = New-Object System.Drawing.Size(880, 25)
    $cciStatusLabel.Text = "No CCI mappings loaded"
    $cciStatusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $cciStatusLabel.ForeColor = [System.Drawing.Color]::Gray
    $cciGroupBox.Controls.Add($cciStatusLabel)
    
    # Group box for STIG Files with modern styling
    $stigGroupBox = New-Object System.Windows.Forms.GroupBox
    $stigGroupBox.Location = New-Object System.Drawing.Point(30, 230)
    $stigGroupBox.Size = New-Object System.Drawing.Size(930, 350)
    $stigGroupBox.Text = " 2. STIG Files (CKL/CKLB) "
    $stigGroupBox.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $stigGroupBox.ForeColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
    $stigGroupBox.BackColor = [System.Drawing.Color]::White
    $stigGroupBox.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $form.Controls.Add($stigGroupBox)
    
    $stigListBox = New-Object System.Windows.Forms.ListBox
    $stigListBox.Location = New-Object System.Drawing.Point(20, 35)
    $stigListBox.Size = New-Object System.Drawing.Size(720, 240)
    $stigListBox.SelectionMode = "MultiExtended"
    $stigListBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $stigListBox.BackColor = [System.Drawing.Color]::FromArgb(250, 250, 250)
    $stigListBox.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
    $stigGroupBox.Controls.Add($stigListBox)
    
    $stigAddBtn = New-Object System.Windows.Forms.Button
    $stigAddBtn.Location = New-Object System.Drawing.Point(750, 35)
    $stigAddBtn.Size = New-Object System.Drawing.Size(160, 35)
    $stigAddBtn.Text = "Add Files..."
    $stigAddBtn.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
    $stigAddBtn.BackColor = [System.Drawing.Color]::FromArgb(16, 124, 16)
    $stigAddBtn.ForeColor = [System.Drawing.Color]::White
    $stigAddBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $stigAddBtn.FlatAppearance.BorderSize = 0
    $stigAddBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $stigGroupBox.Controls.Add($stigAddBtn)
    
    $stigClearBtn = New-Object System.Windows.Forms.Button
    $stigClearBtn.Location = New-Object System.Drawing.Point(750, 80)
    $stigClearBtn.Size = New-Object System.Drawing.Size(160, 35)
    $stigClearBtn.Text = "Clear All"
    $stigClearBtn.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $stigClearBtn.BackColor = [System.Drawing.Color]::FromArgb(200, 200, 200)
    $stigClearBtn.ForeColor = [System.Drawing.Color]::FromArgb(50, 50, 50)
    $stigClearBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $stigClearBtn.FlatAppearance.BorderSize = 0
    $stigClearBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $stigGroupBox.Controls.Add($stigClearBtn)
    
    $stigStatsLabel = New-Object System.Windows.Forms.Label
    $stigStatsLabel.Location = New-Object System.Drawing.Point(20, 290)
    $stigStatsLabel.Size = New-Object System.Drawing.Size(880, 45)
    $stigStatsLabel.Text = "No STIG files loaded"
    $stigStatsLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $stigStatsLabel.ForeColor = [System.Drawing.Color]::Gray
    $stigGroupBox.Controls.Add($stigStatsLabel)
    
    # Group box for Export with modern styling
    $exportGroupBox = New-Object System.Windows.Forms.GroupBox
    $exportGroupBox.Location = New-Object System.Drawing.Point(30, 600)
    $exportGroupBox.Size = New-Object System.Drawing.Size(930, 100)
    $exportGroupBox.Text = " 3. Export to Excel "
    $exportGroupBox.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $exportGroupBox.ForeColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
    $exportGroupBox.BackColor = [System.Drawing.Color]::White
    $exportGroupBox.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $form.Controls.Add($exportGroupBox)
    
    $exportBtn = New-Object System.Windows.Forms.Button
    $exportBtn.Location = New-Object System.Drawing.Point(20, 35)
    $exportBtn.Size = New-Object System.Drawing.Size(220, 45)
    $exportBtn.Text = "Export to Excel..."
    $exportBtn.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $exportBtn.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
    $exportBtn.ForeColor = [System.Drawing.Color]::White
    $exportBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $exportBtn.FlatAppearance.BorderSize = 0
    $exportBtn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $exportBtn.Enabled = $false
    $exportGroupBox.Controls.Add($exportBtn)
    
    $exportStatusLabel = New-Object System.Windows.Forms.Label
    $exportStatusLabel.Location = New-Object System.Drawing.Point(260, 35)
    $exportStatusLabel.Size = New-Object System.Drawing.Size(650, 45)
    $exportStatusLabel.Text = "Load CCI mappings and STIG files to enable export"
    $exportStatusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $exportStatusLabel.ForeColor = [System.Drawing.Color]::Gray
    $exportGroupBox.Controls.Add($exportStatusLabel)
    
    #region Event Handlers
    
    # CCI Browse button
    $cciBrowseBtn.Add_Click({
        $openFileDialog = New-Object System.Windows.Forms.OpenFileDialog
        $openFileDialog.Filter = "CCI List XML (*.xml)|*.xml|All Files (*.*)|*.*"
        $openFileDialog.Title = "Select U_CCI_List.xml"
        
        if ($openFileDialog.ShowDialog() -eq "OK") {
            $cciTextBox.Text = $openFileDialog.FileName
            $statusLabel.Text = "Loading CCI mappings..."
            $form.Refresh()
            
            $result = Import-CciMappings -XmlPath $openFileDialog.FileName
            
            if ($result.Success) {
                $script:CciMappings = $result.Mappings
                $cciStatusLabel.Text = "[OK] Loaded $($result.Count) CCI mappings"
                $cciStatusLabel.ForeColor = [System.Drawing.Color]::Green
                $statusLabel.Text = "CCI mappings loaded successfully"
                
                # Update export button state
                if ($script:VulnerabilityData.Count -gt 0) {
                    $exportBtn.Enabled = $true
                }
            }
            else {
                [System.Windows.Forms.MessageBox]::Show("Failed to load CCI mappings:`n$($result.Error)", "Error", "OK", "Error")
                $cciStatusLabel.Text = "[ERROR] Failed to load CCI mappings"
                $cciStatusLabel.ForeColor = [System.Drawing.Color]::Red
                $statusLabel.Text = "Error loading CCI mappings"
            }
        }
    })
    
    # STIG Add button
    $stigAddBtn.Add_Click({
        if ($script:CciMappings.Count -eq 0) {
            [System.Windows.Forms.MessageBox]::Show("Please load CCI mappings first.", "Information", "OK", "Information")
            return
        }
        
        $openFileDialog = New-Object System.Windows.Forms.OpenFileDialog
        $openFileDialog.Filter = "STIG Files (*.ckl;*.cklb)|*.ckl;*.cklb|CKL Files (*.ckl)|*.ckl|CKLB Files (*.cklb)|*.cklb|All Files (*.*)|*.*"
        $openFileDialog.Title = "Select STIG Files"
        $openFileDialog.Multiselect = $true
        
        if ($openFileDialog.ShowDialog() -eq "OK") {
            $statusLabel.Text = "Loading STIG files..."
            $form.Refresh()
            
            $totalLoaded = 0
            foreach ($file in $openFileDialog.FileNames) {
                $fileName = Split-Path -Path $file -Leaf
                
                # Check if already loaded
                if ($script:LoadedFiles -contains $fileName) {
                    continue
                }
                
                $extension = [System.IO.Path]::GetExtension($file).ToLower()
                $result = $null
                
                if ($extension -eq '.ckl' -or $extension -eq '.xml') {
                    $result = Import-CklFile -Path $file -CciMappings $script:CciMappings
                }
                elseif ($extension -eq '.cklb' -or $extension -eq '.json') {
                    $result = Import-CklbFile -Path $file -CciMappings $script:CciMappings
                }
                
                if ($result -and $result.Success) {
                    $script:VulnerabilityData += $result.Vulnerabilities
                    $script:LoadedFiles += $fileName
                    $stigListBox.Items.Add("$fileName ($($result.Count) findings)")
                    $totalLoaded += $result.Count
                }
            }
            
            if ($totalLoaded -gt 0) {
                $stigStatsLabel.Text = "[OK] Loaded $($script:LoadedFiles.Count) files with $($script:VulnerabilityData.Count) total findings"
                $stigStatsLabel.ForeColor = [System.Drawing.Color]::Green
                $statusLabel.Text = "STIG files loaded successfully"
                $exportBtn.Enabled = $true
            }
        }
    })
    
    # STIG Clear button
    $stigClearBtn.Add_Click({
        $script:VulnerabilityData = @()
        $script:LoadedFiles = @()
        $stigListBox.Items.Clear()
        $stigStatsLabel.Text = "No STIG files loaded"
        $stigStatsLabel.ForeColor = [System.Drawing.Color]::Gray
        $exportBtn.Enabled = $false
        $statusLabel.Text = "STIG files cleared"
    })
    
    # Export button
    $exportBtn.Add_Click({
        if ($script:VulnerabilityData.Count -eq 0) {
            [System.Windows.Forms.MessageBox]::Show("No data to export.", "Information", "OK", "Information")
            return
        }
        
        $saveFileDialog = New-Object System.Windows.Forms.SaveFileDialog
        $saveFileDialog.Filter = "Excel Files (*.xlsx)|*.xlsx"
        $saveFileDialog.Title = "Save Excel Report"
        $saveFileDialog.FileName = "STIG-Analysis-$(Get-Date -Format 'yyyyMMdd-HHmmss').xlsx"
        
        if ($saveFileDialog.ShowDialog() -eq "OK") {
            $statusLabel.Text = "Exporting to Excel..."
            $exportStatusLabel.Text = "Creating Excel workbook..."
            $form.Refresh()
            
            $result = Export-ToExcel -Vulnerabilities $script:VulnerabilityData -OutputPath $saveFileDialog.FileName
            
            if ($result.Success) {
                $exportStatusLabel.Text = "[OK] Exported $($script:VulnerabilityData.Count) findings to Excel"
                $exportStatusLabel.ForeColor = [System.Drawing.Color]::Green
                $statusLabel.Text = "Export completed successfully"
                
                $openResult = [System.Windows.Forms.MessageBox]::Show("Export completed successfully!`n`nOpen the file now?", "Success", "YesNo", "Information")
                if ($openResult -eq "Yes") {
                    Start-Process $saveFileDialog.FileName
                }
            }
            else {
                [System.Windows.Forms.MessageBox]::Show("Failed to export:`n$($result.Error)", "Error", "OK", "Error")
                $exportStatusLabel.Text = "[ERROR] Export failed"
                $exportStatusLabel.ForeColor = [System.Drawing.Color]::Red
                $statusLabel.Text = "Export failed"
            }
        }
    })
    
    #endregion
    
    # Show form
    $form.Add_Shown({ $form.Activate() })
    [void]$form.ShowDialog()
}

#endregion

# Check for Excel
try {
    $null = New-Object -ComObject Excel.Application -ErrorAction Stop
}
catch {
    [System.Windows.Forms.MessageBox]::Show("Microsoft Excel is not installed.`n`nThis tool requires Office 2016 or later.", "Error", "OK", "Error")
    exit 1
}

# Start the application
Show-MainForm
