'use client';

import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { PlayerSidebar } from './PlayerSidebar';
import { BottomPlayer } from '../components/BottomPlayer';
import { useCurrentTrack } from '@/hooks/use-current-track';

export default function PlayerLayout({ children }: { children: ReactNode }) {
  const { track } = useCurrentTrack();
  console.log(track?.name);
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <PlayerSidebar />
        <SidebarInset className="flex flex-col">
          {/* Заголовок с кнопкой toggle */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-ellipsis whitespace-nowrap text-gray-500">{track ? track?.name : 'Audio Editor'}</h1>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4">{children}</main>
          <BottomPlayer />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
