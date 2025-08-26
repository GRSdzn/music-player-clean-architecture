# Цель

Локальный аудио‑редактор/плеер без сервера: загрузка треков, список в боковом меню, страница трека по id, нижний фиксированный плеер с seek/громкостью, эффекты: speed, reverb, bass boost. Стек: Next.js (App Router) + TypeScript + Zustand + Tone.js + shadcn/ui. Хранение: IndexedDB.

---

## Слои (чистая архитектура внутри feature)

- **domain**: сущности, интерфейсы репозиториев/юзкейсов.
- **application**: юзкейсы, store, компоненты бизнес-логики.
- **infrastructure**: адаптеры (Tone.js, IndexedDB и др.).
- **presentation**: UI компоненты React.

Зависимости: presentation → application → domain; infrastructure внедряется в application.

---

## Фичи

### 1. Track

- **domain**: `Track`, `EffectSettings`
- **application**: `AddTrackFromFile`, `GetTrackById`, `UpdateEffectSettings`
- **infrastructure**: `TrackRepositoryIndexedDb`, `EffectRepositoryIndexedDb`
- **presentation**: `TrackPage` (`/track/[id]`), `TrackEffectsPanel`, waveform, UI для настроек эффектов.

### 2. Library

- **domain**: список треков
- **application**: `ListTracks`, `RemoveTrack`
- **infrastructure**: работа с IndexedDB для списка
- **presentation**: `Sidebar`, загрузка файлов, поиск, переходы

### 3. Player ✅ **Реализовано**

- **domain**:
  - `PlaybackState` - состояние воспроизведения
  - `AudioTrack` - интерфейс аудио трека
  - `EffectSettings` - настройки эффектов
  - `AudioEngineRepository` - контракт для аудио движка
- **application**:
  - `PlaybackControls` - use case для управления воспроизведением
  - `SelectTrack` - use case для выбора трека
  - `playbackStore` - Zustand store для состояния плеера
- **infrastructure**:
  - `ToneEngine` - реализация AudioEngineRepository через Tone.js
- **presentation**:
  - `BottomPlayer.tsx` - React компонент нижнего плеера

### 4. Shared

- **ui**: общие компоненты shadcn (Button, Slider, Dialog, Sidebar, Layout)
- **lib**: утилиты (ids, time)
- **persistence**: общая работа с IndexedDB
- **store**: провайдеры и общие store

---

## Дерево проекта

```
src/
  app/
    (main)/layout.tsx
    page.tsx
    track/[id]/page.tsx
    globals.css

  features/
    track/
      domain/
        entities.ts
        repositories.ts
      application/
        AddTrackFromFile.ts
        GetTrackById.ts
        UpdateEffectSettings.ts
      infrastructure/
        TrackRepositoryIndexedDb.ts
        EffectRepositoryIndexedDb.ts
      presentation/
        TrackPage.tsx
        TrackEffectsPanel.tsx
        Waveform.tsx

    library/
      domain/
        entities.ts
      application/
        ListTracks.ts
        RemoveTrack.ts
      infrastructure/
        LibraryRepositoryIndexedDb.ts
      presentation/
        Sidebar.tsx
        UploadDialog.tsx

    player/ ✅ **Реализовано**
      domain/
        entities.ts          # PlaybackState, AudioTrack, EffectSettings
        repositories.ts      # AudioEngineRepository interface
      application/
        components/
          PlaybackControls.ts # Use case для управления воспроизведением
          SelectTrack.ts     # Use case для выбора трека
        store/
          playbackStore.ts   # Zustand store с состоянием плеера
      infrastructure/
        ToneEngine.ts        # Реализация через Tone.js
      presentation/
        BottomPlayer.tsx     # React компонент UI

  shared/
    ui/
      FileDrop.tsx
      Button.tsx
      Slider.tsx
    lib/
      time.ts
      ids.ts
    persistence/
      indexedDb.ts
    store/
      providers/StoreProvider.tsx
      slices/
        player.ts
        effects.ts
        library.ts
        ui.ts

  styles/
    shadcn.css
```

---

## Жизненный цикл

1. Пользователь загружает файл → `track.application.AddTrackFromFile` сохраняет blob в IndexedDB.
2. Library через `ListTracks` отображает список.
3. Переход на `/track/[id]` → `track.application.GetTrackById` + загрузка в Player.
4. Player через `ToneEngine` управляет воспроизведением.
5. Изменения эффектов (`UpdateEffectSettings`) обновляют и IndexedDB, и Engine.

---

## Мини‑план интеграции

1. ✅ Каркас App Router + layout (Sidebar + BottomPlayer).
2. ⏳ IndexedDB + репозитории.
3. ✅ ToneEngine + Zustand связка.
4. ⏳ Фича `library` — загрузка и отображение треков.
5. ⏳ Фича `track` — страница с эффектами.
6. ✅ Фича `player` — управление воспроизведением (архитектура готова).
7. ⏳ UI улучшения и расширения.

---

Теперь каждая фича содержит полный цикл (domain → application → infra → presentation), а общее выносится в `shared/`. Это соответствует **feature-sliced architecture**.
