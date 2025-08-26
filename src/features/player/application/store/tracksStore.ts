// src/features/player/application/store/tracksStore.ts
import { create } from "zustand";
import { AudioTrack } from "@/features/player/domain/entities";
import { TrackRepositoryIndexedDB } from "@/features/player/infrastructure/TrackRepositoryIndexedDB";
import { usePlaybackStore } from "./playbackStore";

const repo = new TrackRepositoryIndexedDB();

interface TracksStore {
  tracks: AudioTrack[];
  currentTrackId: string | null;
  loadTracks: () => Promise<void>;
  addTrack: (track: AudioTrack) => Promise<void>;
  selectTrack: (id: string) => void;
  removeTrack: (id: string) => Promise<void>;
}

export const useTracksStore = create<TracksStore>((set, get) => ({
  tracks: [],
  currentTrackId: null,

  loadTracks: async () => {
    const allTracks = await repo.getAllTracks();
    set({ tracks: allTracks });
  },

  addTrack: async (track) => {
    await repo.addTrack(track);
    set((state) => ({ tracks: [...state.tracks, track] }));
  },

  removeTrack: async (id) => {
    const { currentTrackId } = get();

    // Если удаляемый трек является текущим воспроизводимым
    if (currentTrackId === id) {
      // Останавливаем воспроизведение
      const { pause } = usePlaybackStore.getState();
      pause();

      // Сбрасываем текущий трек
      set({ currentTrackId: null });
    }

    await repo.removeTrack(id);
    set((state) => ({
      tracks: state.tracks.filter((track) => track.id !== id),
    }));
  },

  selectTrack: (id) => {
    set({ currentTrackId: id });
  },
}));
