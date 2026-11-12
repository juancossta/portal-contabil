// Demo storage: files are available only in this browser, never shared remotely.
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("portal-contabil-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Armazenamento de arquivos indisponível."));
  });
}

export async function saveLocalFiles(files: { key: string; file: File }[]): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(new Error("Não foi possível guardar os arquivos. Verifique o espaço disponível no navegador."));
      for (const item of files) tx.objectStore("files").put(item.file, item.key);
    });
  } finally { db.close(); }
}

export async function downloadLocalFile(key: string, name: string): Promise<void> {
  const db = await database();
  try {
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction("files").objectStore("files").get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Falha ao recuperar o arquivo."));
    });
    if (!blob) throw new Error("Arquivo indisponível neste navegador. Solicite um novo envio.");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally { db.close(); }
}

export async function clearLocalFiles(): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(new Error("Não foi possível limpar os arquivos locais."));
    });
  } finally { db.close(); }
}
