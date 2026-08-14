import { doc, setDoc, getDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { handleFirestoreError, OperationType } from "../lib/firebaseService";

const DB_NAME = "portfolio-image-store";
const STORE_NAME = "images";
const DB_VERSION = 1;

// Um documento do Firestore não pode passar de ~1 MiB. Como a imagem vai
// embutida como data URL, recusamos antes de tentar gravar — assim o erro
// aparece na interface em vez de a imagem ficar só neste navegador.
const MAX_DATA_URL_BYTES = 900_000;

export interface StoredImage {
  name: string;
  dataUrl: string;
  size: number;
  addedAt: number;
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: "name" });
      }
    };
  });
}

// Local storage helpers (IndexedDB acts as a persistent high-performance cache)
async function saveLocalImage(name: string, dataUrl: string, size: number, addedAt: number): Promise<void> {
  const dbInstance = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const record: StoredImage = { name, dataUrl, size, addedAt };
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getLocalImage(name: string): Promise<string | null> {
  const dbInstance = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(name);
    request.onsuccess = () => {
      const result = request.result as StoredImage | undefined;
      resolve(result ? result.dataUrl : null);
    };
    request.onerror = () => reject(request.error);
  });
}

async function deleteLocalImage(name: string): Promise<void> {
  const dbInstance = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function listLocalImages(): Promise<StoredImage[]> {
  const dbInstance = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = (request.result || []) as StoredImage[];
      results.sort((a, b) => b.addedAt - a.addedAt);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

// Exported high-level functions with Firestore Synchronization

// In-memory cache for instant synchronous/microtask retrieval
const memoryImageCache = new Map<string, string>();

/**
 * Gets an image data URL synchronously from the in-memory cache if available.
 */
export function getSyncImage(name: string): string | null {
  return memoryImageCache.get(name) || null;
}

/**
 * Saves an image to local storage (IndexedDB) and synchronizes it to the Firestore cloud database.
 * Lança erro se a gravação na nuvem falhar, para que a interface avise em vez de
 * dar a imagem como salva quando ela existe apenas neste navegador.
 */
export async function saveImage(name: string, dataUrl: string, size: number): Promise<void> {
  const addedAt = Date.now();

  if (dataUrl.length > MAX_DATA_URL_BYTES) {
    throw new Error(
      `A imagem tem ${Math.round(dataUrl.length / 1024)}KB e ultrapassa o limite de ` +
      `${Math.round(MAX_DATA_URL_BYTES / 1024)}KB por documento do Firestore. ` +
      `Reduza a resolução ou a qualidade e tente de novo.`
    );
  }

  // 0. Update in-memory cache for instant 0ms retrieval
  memoryImageCache.set(name, dataUrl);

  // 1. Save locally first (guaranteed instant success)
  await saveLocalImage(name, dataUrl, size, addedAt);

  // 2. Sincroniza com a nuvem
  const docRef = doc(db, "portfolio_images", name);
  await setDoc(docRef, {
    name,
    dataUrl,
    size,
    addedAt
  });
}

/**
 * Gets the image data URL by name, trying the in-memory cache first, local cache (IndexedDB) second, and falling back to Firestore if missing.
 */
export async function getImage(name: string): Promise<string | null> {
  // 0. Check fast in-memory cache first
  if (memoryImageCache.has(name)) {
    return memoryImageCache.get(name)!;
  }

  // 1. Check local cache (IndexedDB)
  try {
    const localData = await getLocalImage(name);
    if (localData) {
      memoryImageCache.set(name, localData);
      return localData;
    }
  } catch (err) {
    console.warn("Local IndexedDB read failed:", err);
  }

  // 2. Fetch from Firestore cloud database
  try {
    const docRef = doc(db, "portfolio_images", name);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as StoredImage;
      memoryImageCache.set(data.name, data.dataUrl);
      // Populate local cache for fast future retrieval
      try {
        await saveLocalImage(data.name, data.dataUrl, data.size, data.addedAt);
      } catch (cacheErr) {
        console.warn("Failed to populate local cache:", cacheErr);
      }
      return data.dataUrl;
    }
  } catch (error) {
    console.warn("Firestore image fetch warning (operating in local mode):", error);
  }

  return null;
}

/**
 * Deletes the image from both local storage (IndexedDB) and the Firestore cloud database.
 */
export async function deleteImage(name: string): Promise<void> {
  // 1. Delete locally
  await deleteLocalImage(name);

  // 2. Delete from Firestore cloud
  const fullPath = `portfolio_images/${name}`;
  try {
    const docRef = doc(db, "portfolio_images", name);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, fullPath);
  }
}

/**
 * Lists all images, preferentially pulling the latest list from the Firestore cloud database
 * and updating the local IndexedDB cache, with automatic offline fallback to local IndexedDB.
 * Also performs an automatic two-way synchronization: uploads local-only images to Firestore,
 * and caches Firestore-only images in the local IndexedDB.
 */
export async function listImages(): Promise<StoredImage[]> {
  // 1. Always load the local images first to see what we have locally
  const localImages = await listLocalImages();
  const localMap = new Map(localImages.map(img => [img.name, img]));

  try {
    const colRef = collection(db, "portfolio_images");
    const querySnapshot = await getDocs(colRef);
    const firestoreImages: StoredImage[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.name && data.dataUrl) {
        firestoreImages.push({
          name: data.name,
          dataUrl: data.dataUrl,
          size: data.size || 0,
          addedAt: data.addedAt || Date.now(),
        });
      }
    });

    const firestoreMap = new Map(firestoreImages.map(img => [img.name, img]));
    let synchronized = false;

    // 2. Upload local-only images to Firestore to synchronize them to the cloud.
    // Só o administrador autenticado pode gravar; para os visitantes essa etapa
    // é ignorada (as regras do Firestore recusariam a escrita de qualquer forma).
    for (const localImg of (auth.currentUser ? localImages : [])) {
      if (!firestoreMap.has(localImg.name)) {
        console.log(`Syncing local-only image to Firestore: ${localImg.name}`);
        const docRef = doc(db, "portfolio_images", localImg.name);
        await setDoc(docRef, {
          name: localImg.name,
          dataUrl: localImg.dataUrl,
          size: localImg.size,
          addedAt: localImg.addedAt
        });
        firestoreImages.push(localImg);
        firestoreMap.set(localImg.name, localImg);
        synchronized = true;
      }
    }

    // 3. Cache Firestore-only images in IndexedDB
    for (const cloudImg of firestoreImages) {
      if (!localMap.has(cloudImg.name)) {
        console.log(`Syncing Firestore-only image to IndexedDB cache: ${cloudImg.name}`);
        await saveLocalImage(cloudImg.name, cloudImg.dataUrl, cloudImg.size, cloudImg.addedAt);
        synchronized = true;
      }
    }

    if (synchronized) {
      console.log("Two-way image synchronization completed successfully.");
    }

    // Sort by addedAt descending
    firestoreImages.sort((a, b) => b.addedAt - a.addedAt);
    return firestoreImages;
  } catch (error) {
    console.warn("Firestore list/sync failed, falling back to local storage cache:", error);
    // Silent fallback to local cache
    return localImages;
  }
}
