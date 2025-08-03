// src/utils/db.js
import { openDB } from 'idb';

const DB_NAME = 'rollcall-db';
const STORE_NAME = 'offline-records';
const DB_VERSION = 1;

// 使用單例模式確保只有一個資料庫連線實例
let dbPromise;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 當資料庫版本更新或首次建立時，建立一個名為 'offline-records' 的儲存空間
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: 'id', // 使用記錄的 id 作為主鍵
          });
        }
      },
    });
  }
  return dbPromise;
};

/**
 * 將一筆記錄新增或更新到離線資料庫
 * @param {object} record - 要儲存的簽到記錄
 */
export async function addOfflineRecord(record) {
  const db = await getDb();
  await db.put(STORE_NAME, record);
}

/**
 * 獲取所有離線儲存的記錄
 * @returns {Promise<Array>} - 包含所有離線記錄的陣列
 */
export async function getOfflineRecords() {
  const db = await getDb();
  return await db.getAll(STORE_NAME);
}

/**
 * 清空所有離線記錄 (通常在同步成功後呼叫)
 */
export async function clearOfflineRecords() {
  const db = await getDb();
  await db.clear(STORE_NAME);
}