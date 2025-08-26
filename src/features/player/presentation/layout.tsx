// app/(player)/layout.tsx
"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/features/player/presentation/Sidebar";
import { BottomPlayer } from "@/features/player/presentation/BottomPlayer";

export default function PlayerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="player-layout flex h-screen">
      {/* Боковое меню */}
      <Sidebar />

      {/* Основная область */}
      <main className="flex-1 overflow-auto p-4">{children}</main>

      {/* Нижний плеер */}
      <BottomPlayer />
    </div>
  );
}
