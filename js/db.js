//IndexedDB 数据库操作封装
//关于IndecedDB，是一种浏览器内置的 NoSQL（非关系型）数据库。
const DB_NAME = 'MusicPlayerDB';//数据库名称
const DB_VERSION = 1; //数据库版本

//打开/创建数据库
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
         // 首次打开时创建存储仓库
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('blobs')) {
                db.createObjectStore('blobs');// 创建一个叫 'blobs' 的仓库
            }
        };
        req.onsuccess = () => resolve(req.result);// 成功返回数据库对象
        req.onerror = () => reject(req.error); // 失败返回错误
    });
}
//写入数据库
async function dbPut(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('blobs', 'readwrite');
        tx.objectStore('blobs').put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
//读取数据
async function dbGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('blobs', 'readonly');
        const req = tx.objectStore('blobs').get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
//删除数据
async function dbDelete(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('blobs', 'readwrite');
        tx.objectStore('blobs').delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}