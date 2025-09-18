/* Data Store - Persistent Storage System
   - Manages data persistence across pages using IndexedDB and localStorage
   - Provides unified API for STIG data, POAMs, and application state
   - Handles data synchronization and export functionality
*/

class DataStore {
    constructor() {
        this.dbName = 'STIGMapperDB';
        this.dbVersion = 1;
        this.db = null;
        this.isReady = false;
        this.eventBus = new EventTarget();
        
        // Fallback to localStorage if IndexedDB fails
        this.useLocalStorage = false;
        
        this.init();
    }

    async init() {
        try {
            await this.initIndexedDB();
            console.log('DataStore initialized with IndexedDB');
        } catch (error) {
            console.warn('IndexedDB failed, falling back to localStorage:', error);
            this.useLocalStorage = true;
            this.initLocalStorage();
        }
        
        this.isReady = true;
        this.emit('ready');
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB not supported'));
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // STIG Data Store
                if (!db.objectStoreNames.contains('stigData')) {
                    const stigStore = db.createObjectStore('stigData', { keyPath: 'id', autoIncrement: true });
                    stigStore.createIndex('fileName', 'fileName', { unique: false });
                    stigStore.createIndex('stigName', 'stigName', { unique: false });
                    stigStore.createIndex('importDate', 'importDate', { unique: false });
                }

                // POAM Store
                if (!db.objectStoreNames.contains('poams')) {
                    const poamStore = db.createObjectStore('poams', { keyPath: 'id', autoIncrement: true });
                    poamStore.createIndex('vulnId', 'vulnId', { unique: false });
                    poamStore.createIndex('status', 'status', { unique: false });
                    poamStore.createIndex('severity', 'severity', { unique: false });
                    poamStore.createIndex('assignee', 'assignee', { unique: false });
                    poamStore.createIndex('dueDate', 'dueDate', { unique: false });
                }

                // Milestones Store
                if (!db.objectStoreNames.contains('milestones')) {
                    const milestoneStore = db.createObjectStore('milestones', { keyPath: 'id', autoIncrement: true });
                    milestoneStore.createIndex('poamId', 'poamId', { unique: false });
                    milestoneStore.createIndex('status', 'status', { unique: false });
                    milestoneStore.createIndex('dueDate', 'dueDate', { unique: false });
                }

                // Application Settings Store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // CCI Mappings Store
                if (!db.objectStoreNames.contains('cciMappings')) {
                    db.createObjectStore('cciMappings', { keyPath: 'cciId' });
                }
            };
        });
    }

    initLocalStorage() {
        // Initialize localStorage structure
        const stores = ['stigData', 'poams', 'milestones', 'settings', 'cciMappings'];
        stores.forEach(store => {
            if (!localStorage.getItem(store)) {
                localStorage.setItem(store, JSON.stringify([]));
            }
        });
    }

    // Generic CRUD operations
    async create(storeName, data) {
        if (this.useLocalStorage) {
            return this.createLocalStorage(storeName, data);
        }
        return this.createIndexedDB(storeName, data);
    }

    async read(storeName, query = null) {
        if (this.useLocalStorage) {
            return this.readLocalStorage(storeName, query);
        }
        return this.readIndexedDB(storeName, query);
    }

    async update(storeName, data) {
        if (this.useLocalStorage) {
            return this.updateLocalStorage(storeName, data);
        }
        return this.updateIndexedDB(storeName, data);
    }

    async delete(storeName, id) {
        if (this.useLocalStorage) {
            return this.deleteLocalStorage(storeName, id);
        }
        return this.deleteIndexedDB(storeName, id);
    }

    // IndexedDB implementations
    async createIndexedDB(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            data.createdAt = new Date().toISOString();
            data.updatedAt = data.createdAt;

            const request = store.add(data);
            request.onsuccess = () => {
                data.id = request.result;
                console.log(`[DataStore] Record created with ID: ${data.id}`);
                this.emit('dataChanged', { action: 'create', store: storeName, data });
            };
            request.onerror = () => reject(request.error);

            // Wait for transaction to complete before resolving
            transaction.oncomplete = () => {
                console.log(`[DataStore] Transaction completed for ${storeName} create`);
                resolve(data);
            };
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async readIndexedDB(storeName, query = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);

            let request;

            if (query) {
                if (query.index && query.value) {
                    const index = store.index(query.index);
                    request = index.getAll(query.value);
                } else if (query.id) {
                    request = store.get(query.id);
                } else {
                    request = store.getAll();
                }
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => {
                // Store the result for when transaction completes
                const result = request.result;
                console.log(`[DataStore] Request succeeded for ${storeName} read, waiting for transaction`);
            };
            request.onerror = () => reject(request.error);

            // Wait for transaction to complete before resolving
            transaction.oncomplete = () => {
                console.log(`[DataStore] Transaction completed for ${storeName} read`);
                resolve(request.result);
            };
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async updateIndexedDB(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            data.updatedAt = new Date().toISOString();
            
            const request = store.put(data);
            request.onsuccess = () => {
                this.emit('dataChanged', { action: 'update', store: storeName, data });
                resolve(data);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteIndexedDB(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.delete(id);
            request.onsuccess = () => {
                this.emit('dataChanged', { action: 'delete', store: storeName, id });
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // localStorage implementations (fallback)
    createLocalStorage(storeName, data) {
        const items = JSON.parse(localStorage.getItem(storeName) || '[]');
        data.id = Date.now() + Math.random(); // Simple ID generation
        data.createdAt = new Date().toISOString();
        data.updatedAt = data.createdAt;
        
        items.push(data);
        localStorage.setItem(storeName, JSON.stringify(items));
        
        this.emit('dataChanged', { action: 'create', store: storeName, data });
        return Promise.resolve(data);
    }

    readLocalStorage(storeName, query = null) {
        const items = JSON.parse(localStorage.getItem(storeName) || '[]');
        
        if (query) {
            if (query.id) {
                return Promise.resolve(items.find(item => item.id === query.id));
            } else if (query.index && query.value) {
                return Promise.resolve(items.filter(item => item[query.index] === query.value));
            }
        }
        
        return Promise.resolve(items);
    }

    updateLocalStorage(storeName, data) {
        const items = JSON.parse(localStorage.getItem(storeName) || '[]');
        const index = items.findIndex(item => item.id === data.id);
        
        if (index !== -1) {
            data.updatedAt = new Date().toISOString();
            items[index] = data;
            localStorage.setItem(storeName, JSON.stringify(items));
            this.emit('dataChanged', { action: 'update', store: storeName, data });
        }
        
        return Promise.resolve(data);
    }

    deleteLocalStorage(storeName, id) {
        const items = JSON.parse(localStorage.getItem(storeName) || '[]');
        const filteredItems = items.filter(item => item.id !== id);
        
        localStorage.setItem(storeName, JSON.stringify(filteredItems));
        this.emit('dataChanged', { action: 'delete', store: storeName, id });
        
        return Promise.resolve(true);
    }

    // Specialized methods for STIG data
    async saveStigData(stigData, fileName, fileType) {
        console.log('[DataStore] saveStigData called:', { fileName, fileType, rowCount: stigData.rows ? stigData.rows.length : 0 });

        const stigRecord = {
            fileName,
            fileType,
            stigName: stigData.stigName || 'Unknown STIG',
            importDate: new Date().toISOString(),
            rowCount: stigData.rows ? stigData.rows.length : 0,
            data: stigData
        };

        console.log('[DataStore] Saving STIG record:', stigRecord);
        const result = await this.create('stigData', stigRecord);
        console.log('[DataStore] STIG data saved successfully:', result);

        return result;
    }

    async getStigData(fileName = null) {
        if (fileName) {
            return await this.read('stigData', { index: 'fileName', value: fileName });
        }
        return await this.read('stigData');
    }

    async getAllStigRows() {
        console.log('[DataStore] getAllStigRows called - checking if ready:', this.isReady);
        console.log('[DataStore] Using localStorage fallback:', this.useLocalStorage);

        const stigRecords = await this.read('stigData');
        console.log('[DataStore] Retrieved STIG records from storage:', stigRecords.length, 'records');

        const allRows = [];

        stigRecords.forEach(record => {
            console.log(`[DataStore] Processing record ${record.id}: file=${record.fileName}, rows=${record.data?.rows?.length || 0}`);
            if (record.data && record.data.rows) {
                record.data.rows.forEach(row => {
                    // Add metadata to each row
                    row._sourceFile = record.fileName;
                    row._importDate = record.importDate;
                    row._recordId = record.id;
                    allRows.push(row);
                });
            } else {
                console.warn('[DataStore] Record missing data.rows:', record);
            }
        });

        console.log('[DataStore] Total rows extracted:', allRows.length);
        return allRows;
    }

    // Specialized methods for POAMs
    async savePOAM(poamData) {
        if (poamData.id) {
            return await this.update('poams', poamData);
        } else {
            return await this.create('poams', poamData);
        }
    }

    async getPOAMs(filters = {}) {
        const poams = await this.read('poams');
        
        if (Object.keys(filters).length === 0) {
            return poams;
        }

        return poams.filter(poam => {
            return Object.entries(filters).every(([key, value]) => {
                if (Array.isArray(value)) {
                    return value.includes(poam[key]);
                }
                return poam[key] === value;
            });
        });
    }

    async deletePOAM(id) {
        // Also delete associated milestones
        const milestones = await this.read('milestones', { index: 'poamId', value: id });
        for (const milestone of milestones) {
            await this.delete('milestones', milestone.id);
        }
        
        return await this.delete('poams', id);
    }

    // Specialized methods for Milestones
    async saveMilestone(milestoneData) {
        if (milestoneData.id) {
            return await this.update('milestones', milestoneData);
        } else {
            return await this.create('milestones', milestoneData);
        }
    }

    async getMilestones(poamId = null) {
        if (poamId) {
            return await this.read('milestones', { index: 'poamId', value: poamId });
        }
        return await this.read('milestones');
    }

    async deleteMilestone(id) {
        return await this.delete('milestones', id);
    }

    // CCI Mappings
    async saveCCIMappings(cciMap) {
        const promises = Object.entries(cciMap).map(([cciId, nistControls]) => {
            return this.update('cciMappings', { cciId, nistControls });
        });
        
        return await Promise.all(promises);
    }

    async getCCIMappings() {
        const mappings = await this.read('cciMappings');
        const cciMap = {};
        
        mappings.forEach(mapping => {
            cciMap[mapping.cciId] = mapping.nistControls;
        });
        
        return cciMap;
    }

    // Settings management
    async saveSetting(key, value) {
        return await this.update('settings', { key, value });
    }

    async getSetting(key, defaultValue = null) {
        const setting = await this.read('settings', { id: key });
        return setting ? setting.value : defaultValue;
    }

    // Data export functionality
    async exportAllData() {
        const exportData = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            stigData: await this.read('stigData'),
            poams: await this.read('poams'),
            milestones: await this.read('milestones'),
            cciMappings: await this.read('cciMappings'),
            settings: await this.read('settings')
        };

        return exportData;
    }

    async importData(importData) {
        if (!importData.version) {
            throw new Error('Invalid import data format');
        }

        // Clear existing data (optional - could be made configurable)
        const stores = ['stigData', 'poams', 'milestones', 'cciMappings', 'settings'];
        
        for (const store of stores) {
            if (importData[store]) {
                // Clear existing data in store
                const existing = await this.read(store);
                for (const item of existing) {
                    await this.delete(store, item.id);
                }
                
                // Import new data
                for (const item of importData[store]) {
                    delete item.id; // Let the system assign new IDs
                    await this.create(store, item);
                }
            }
        }

        this.emit('dataImported', importData);
        return true;
    }

    // Utility methods
    async clearAllData() {
        const stores = ['stigData', 'poams', 'milestones', 'cciMappings', 'settings'];
        
        for (const store of stores) {
            const items = await this.read(store);
            for (const item of items) {
                await this.delete(store, item.id);
            }
        }
        
        this.emit('dataCleared');
        return true;
    }

    async getDataStats() {
        const stats = {};
        const stores = ['stigData', 'poams', 'milestones', 'cciMappings'];
        
        for (const store of stores) {
            const items = await this.read(store);
            stats[store] = items.length;
        }
        
        // Additional computed stats
        const stigRows = await this.getAllStigRows();
        stats.totalStigRows = stigRows.length;
        
        const poams = await this.read('poams');
        stats.openPOAMs = poams.filter(p => p.status === 'open').length;
        stats.completedPOAMs = poams.filter(p => p.status === 'completed').length;
        
        return stats;
    }

    // Event system
    emit(eventName, data) {
        this.eventBus.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }

    on(eventName, callback) {
        this.eventBus.addEventListener(eventName, callback);
    }

    off(eventName, callback) {
        this.eventBus.removeEventListener(eventName, callback);
    }

    // Wait for initialization
    async ready() {
        if (this.isReady) return Promise.resolve();
        
        return new Promise(resolve => {
            this.on('ready', resolve);
        });
    }
}

// Create and export a single, initialized instance of the DataStore
const dataStoreInstance = new DataStore();

// Export the singleton instance
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dataStoreInstance;
} else {
    window.DataStore = dataStoreInstance;
}
