// QLD CoC Generator — Zero-Cloud Client-Side Storage Vault (IndexedDB)
// Strictly local, zero server transmission, persistent offline storage for photos and large binaries
(function(window) {
  'use strict';

  const DB_NAME = 'qld_tradie_vault_v1';
  const DB_VERSION = 1;
  const STORE_DRAFT = 'active_draft_photos';
  const STORE_RECORDS = 'record_photos';

  let dbPromise = null;

  function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB is not supported on this browser.');
        resolve(null);
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_DRAFT)) {
          db.createObjectStore(STORE_DRAFT, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_RECORDS)) {
          db.createObjectStore(STORE_RECORDS, { keyPath: 'recordId' });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error('Failed to open IndexedDB vault:', event.target.error);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('IndexedDB database upgrade blocked by another tab.');
      };
    });

    return dbPromise;
  }

  const TradieVault = {
    /**
     * Request persistent storage permission so iOS/Android won't evict under disk pressure
     */
    async requestPersistence() {
      if (navigator.storage && navigator.storage.persist) {
        try {
          const isPersisted = await navigator.storage.persist();
          return isPersisted;
        } catch (_) {
          return false;
        }
      }
      return false;
    },

    /**
     * Save active draft photos array
     * @param {Array<{id: string, dataUrl: string, width: number, height: number, originalName: string}>} photos 
     */
    async saveDraftPhotos(photos) {
      const db = await openDatabase();
      if (!db) return false;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_DRAFT, 'readwrite');
          const store = tx.objectStore(STORE_DRAFT);
          store.put({ key: 'current_draft', photos: photos || [], updatedAt: Date.now() });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          console.error('Error saving draft photos:', e);
          resolve(false);
        }
      });
    },

    /**
     * Retrieve active draft photos
     * @returns {Promise<Array>}
     */
    async getDraftPhotos() {
      const db = await openDatabase();
      if (!db) return [];

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_DRAFT, 'readonly');
          const store = tx.objectStore(STORE_DRAFT);
          const req = store.get('current_draft');
          req.onsuccess = () => {
            resolve(req.result ? req.result.photos : []);
          };
          req.onerror = () => resolve([]);
        } catch (e) {
          console.error('Error loading draft photos:', e);
          resolve([]);
        }
      });
    },

    /**
     * Clear active draft photos
     */
    async clearDraftPhotos() {
      const db = await openDatabase();
      if (!db) return false;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_DRAFT, 'readwrite');
          const store = tx.objectStore(STORE_DRAFT);
          store.delete('current_draft');
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    },

    /**
     * Save photos associated with a generated certificate record
     * @param {string} recordId 
     * @param {Array} photos 
     */
    async saveRecordPhotos(recordId, photos) {
      if (!recordId) return false;
      const db = await openDatabase();
      if (!db) return false;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_RECORDS, 'readwrite');
          const store = tx.objectStore(STORE_RECORDS);
          store.put({
            recordId: recordId,
            photos: photos || [],
            savedAt: Date.now()
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          console.error('Error saving record photos:', e);
          resolve(false);
        }
      });
    },

    /**
     * Retrieve photos for a historical certificate record
     * @param {string} recordId 
     * @returns {Promise<Array>}
     */
    async getRecordPhotos(recordId) {
      if (!recordId) return [];
      const db = await openDatabase();
      if (!db) return [];

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_RECORDS, 'readonly');
          const store = tx.objectStore(STORE_RECORDS);
          const req = store.get(recordId);
          req.onsuccess = () => {
            resolve(req.result ? req.result.photos : []);
          };
          req.onerror = () => resolve([]);
        } catch (e) {
          console.error('Error loading record photos:', e);
          resolve([]);
        }
      });
    },

    /**
     * Delete photos for a specific historical record
     * @param {string} recordId 
     */
    async deleteRecordPhotos(recordId) {
      if (!recordId) return false;
      const db = await openDatabase();
      if (!db) return false;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_RECORDS, 'readwrite');
          const store = tx.objectStore(STORE_RECORDS);
          store.delete(recordId);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    },

    /**
     * Clear all historical record photos
     */
    async clearAllRecordPhotos() {
      const db = await openDatabase();
      if (!db) return false;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction([STORE_DRAFT, STORE_RECORDS], 'readwrite');
          tx.objectStore(STORE_DRAFT).clear();
          tx.objectStore(STORE_RECORDS).clear();
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    }
  };

  // Auto-request persistence on init
  TradieVault.requestPersistence();

  window.TradieVault = TradieVault;
})(window);
