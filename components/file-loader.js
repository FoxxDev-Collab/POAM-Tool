class FileLoader {
    constructor(app) {
        this.app = app;
        this.supportedFormats = {
            stig: ['.json', '.cklb', '.ckl', '.xml'],
            cci: ['.xml']
        };
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.maxFiles = 50;
    }

    init() {
        console.log('FileLoader initialized');
    }

    validateFiles(files, type = 'stig') {
        const errors = [];
        const supportedExts = this.supportedFormats[type] || [];

        // Check file count
        if (files.length > this.maxFiles) {
            errors.push(`Too many files. Maximum ${this.maxFiles} files allowed.`);
        }

        // Check each file
        files.forEach((file, index) => {
            // Check file size
            if (file.size > this.maxFileSize) {
                errors.push(`File "${file.name}" is too large. Maximum size is ${this.formatFileSize(this.maxFileSize)}.`);
            }

            // Check file extension
            const extension = this.getFileExtension(file.name);
            if (!supportedExts.includes(extension)) {
                errors.push(`File "${file.name}" has unsupported format. Supported formats: ${supportedExts.join(', ')}`);
            }

            // Check for empty files
            if (file.size === 0) {
                errors.push(`File "${file.name}" is empty.`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            fileCount: files.length,
            totalSize: files.reduce((sum, file) => sum + file.size, 0)
        };
    }

    getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > -1 ? filename.substring(lastDot).toLowerCase() : '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async processFiles(files, type = 'stig', customCciMap = null) {
        const validation = this.validateFiles(files, type);
        
        if (!validation.isValid) {
            throw new Error(`File validation failed:\n${validation.errors.join('\n')}`);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                // Dispatch progress event
                document.dispatchEvent(new CustomEvent('fileProcessProgress', {
                    detail: {
                        current: i + 1,
                        total: files.length,
                        fileName: file.name,
                        fileSize: file.size
                    }
                }));

                let result;
                if (type === 'stig') {
                    result = await FileImporter.processFile(file, customCciMap);
                    result.fileName = file.name;
                    result.fileSize = file.size;
                } else if (type === 'cci') {
                    const text = await file.text();
                    result = {
                        type: 'CCI',
                        mapping: FileImporter.parseCciXml(text),
                        fileName: file.name,
                        fileSize: file.size
                    };
                }

                results.push(result);

            } catch (error) {
                console.error(`Failed to process file "${file.name}":`, error);
                errors.push({
                    fileName: file.name,
                    error: error.message
                });
            }
        }

        // Dispatch completion event
        document.dispatchEvent(new CustomEvent('fileProcessComplete', {
            detail: {
                results,
                errors,
                totalFiles: files.length,
                successCount: results.length,
                errorCount: errors.length
            }
        }));

        return {
            results,
            errors,
            hasErrors: errors.length > 0,
            allSuccessful: errors.length === 0
        };
    }

    createFileInfo(file) {
        return {
            name: file.name,
            size: file.size,
            formattedSize: this.formatFileSize(file.size),
            type: file.type,
            extension: this.getFileExtension(file.name),
            lastModified: new Date(file.lastModified),
            isValid: true,
            errors: []
        };
    }

    getFileTypeFromExtension(extension) {
        const typeMap = {
            '.json': 'CKLB JSON',
            '.cklb': 'CKLB JSON',
            '.ckl': 'CKL XML',
            '.xml': 'XML'
        };

        return typeMap[extension] || 'Unknown';
    }

    generateFileReport(files) {
        const report = {
            totalFiles: files.length,
            totalSize: files.reduce((sum, file) => sum + file.size, 0),
            formattedTotalSize: this.formatFileSize(files.reduce((sum, file) => sum + file.size, 0)),
            fileTypes: {},
            largestFile: null,
            smallestFile: null,
            averageSize: 0
        };

        if (files.length === 0) return report;

        // Calculate file type distribution
        files.forEach(file => {
            const ext = this.getFileExtension(file.name);
            const type = this.getFileTypeFromExtension(ext);
            report.fileTypes[type] = (report.fileTypes[type] || 0) + 1;
        });

        // Find largest and smallest files
        report.largestFile = files.reduce((largest, file) => 
            file.size > largest.size ? file : largest
        );
        
        report.smallestFile = files.reduce((smallest, file) => 
            file.size < smallest.size ? file : smallest
        );

        // Calculate average size
        report.averageSize = report.totalSize / files.length;
        report.formattedAverageSize = this.formatFileSize(report.averageSize);

        return report;
    }

    // Drag and drop support
    setupDragAndDrop(dropZone, onFilesDropped) {
        if (!dropZone) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0 && onFilesDropped) {
                onFilesDropped(files);
            }
        });

        console.log('FileLoader: Drag and drop support enabled');
    }

    // File reading utilities
    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsText(file);
        });
    }

    async readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsArrayBuffer(file);
        });
    }

    // Progress tracking
    trackProgress(current, total, fileName = '') {
        const percentage = Math.round((current / total) * 100);
        
        document.dispatchEvent(new CustomEvent('fileLoadProgress', {
            detail: {
                current,
                total,
                percentage,
                fileName,
                isComplete: current === total
            }
        }));

        return percentage;
    }
}

// Make available globally
window.FileLoader = FileLoader;
