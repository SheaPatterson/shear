export type IDBStores = "pluginFiles" | "pluginIndex";
const DB_NAME = "shear-plugins";
const DB_VER = 1;

export function openPluginsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("pluginFiles")) db.createObjectStore("pluginFiles", { keyPath: "k" });
      if (!db.objectStoreNames.contains("pluginIndex")) db.createObjectStore("pluginIndex", { keyPath: "pkgKey" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut(store: IDBStores, value: any): Promise<void> {
  const db = await openPluginsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGet<T>(store: IDBStores, key: IDBValidKey): Promise<T | null> {
  const db = await openPluginsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(store: IDBStores, key: IDBValidKey): Promise<void> {
  const db = await openPluginsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetAll<T>(store: IDBStores): Promise<T[]> {
  const db = await openPluginsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}
