'use client';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTracksStore } from '../../application/store/tracksStore';
import { usePlaybackStore } from '../../application/store/playbackStore';

export function TrackUploader() {
  const { tracks, addTrack, selectTrack } = useTracksStore();
  const { isLoading } = usePlaybackStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = async (file: File) => {
    const existingTrack = tracks.find((t) => t.name === file.name);

    if (existingTrack) {
      // Если трек уже существует, выбираем его и переходим на страницу
      selectTrack(existingTrack.id);
      // Убираем loadTrack - пусть TrackPage сам загружает
      router.push(`/track/${existingTrack.id}`);
      return;
    }

    // Если трека нет, создаем новый
    const arrayBuffer = await file.arrayBuffer();

    const track = {
      id: uuidv4(),
      name: file.name,
      buffer: arrayBuffer,
      duration: 0,
    };

    await addTrack(track); // сохраняем в store
    selectTrack(track.id); // выбираем трек
    // Убираем loadTrack - пусть TrackPage сам загружает

    // Авто-редирект на страницу трека
    router.push(`/track/${track.id}`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    await processFile(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter((file) => file.type.startsWith('audio/'));

    if (audioFiles.length > 0) {
      // Обрабатываем только первый аудио файл
      await processFile(audioFiles[0]);
    }
  };

  return (
    <div className="track-uploader">
      <input disabled={isLoading} ref={fileInputRef} type="file" onChange={handleFileChange} accept="audio/*" className="hidden" />
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex items-center justify-center w-full h-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isDragOver ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50 hover:bg-accent'
        }`}
      >
        <Plus className={`h-5 w-5 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className={`ml-2 text-sm ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`}>{isDragOver ? 'Drop audio file here' : 'Add Track'}</span>
      </div>
    </div>
  );
}
