// src/features/player/infrastructure/TrackRepositoryIndexedDB.ts
import { AudioTrack } from "@/features/player/domain/entities";

const DB_NAME = "audio_tracks_db";
const STORE_NAME = "tracks";

export class TrackRepositoryIndexedDB {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addTrack(track: AudioTrack) {
    if (!this.db) await this.init();
    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(track);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async removeTrack(id: string) {
    if (!this.db) await this.init();
    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllTracks(): Promise<AudioTrack[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as AudioTrack[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getTrack(id: string): Promise<AudioTrack | undefined> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () =>
        resolve(request.result as AudioTrack | undefined);
      request.onerror = () => reject(request.error);
    });
  }
}
