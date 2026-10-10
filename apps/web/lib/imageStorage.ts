const DATABASE_NAME =
  "real-estate-plot-viewer-images";
const STORE_NAME = "society-drawings";

function openImageDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DATABASE_NAME,
      1
    );

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSocietyImage(
  imageId: string,
  image: Blob
): Promise<void> {
  const database = await openImageDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      "readwrite"
    );

    transaction.objectStore(STORE_NAME).put(
      image,
      imageId
    );
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error);
  });

  database.close();
}

export async function getSocietyImage(
  imageId: string
): Promise<Blob | null> {
  const database = await openImageDatabase();

  const image = await new Promise<Blob | null>(
    (resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readonly"
      );
      const request = transaction
        .objectStore(STORE_NAME)
        .get(imageId);

      request.onsuccess = () =>
        resolve((request.result as Blob) ?? null);
      request.onerror = () => reject(request.error);
    }
  );

  database.close();
  return image;
}

export async function clearSocietyImages(): Promise<void> {
  const database = await openImageDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      "readwrite"
    );

    transaction.objectStore(STORE_NAME).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error);
  });

  database.close();
}
