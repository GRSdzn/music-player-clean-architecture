"use client";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Home, MoreHorizontal, Music, Trash } from "lucide-react";
import Link from "next/link";
import React from "react";
import { TrackUploader } from "../TrackUploader";
import { useTracksStore } from "../../application/store/tracksStore";
import { usePlaybackStore } from "../../application/store/playbackStore";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AppSidebarContent: React.FC = () => {
  const { tracks, selectTrack, removeTrack } = useTracksStore();
  const { loadTrack } = usePlaybackStore();
  const router = useRouter();
  const handleTrackClick = async (id: string) => {
    const track = tracks.find((t) => t.id === id);
    if (!track) return;

    selectTrack(id);
    await loadTrack(track);
    router.push(`/track/${id}`);
  };

  const handleDeleteTrack = async (id: string) => {
    const track = tracks.find((t) => t.id === id);
    if (!track) return;
    await removeTrack(id);
  };
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/">
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Library</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="px-2 pb-2">
            <TrackUploader />
          </div>
          <SidebarMenu>
            {tracks.map((track) => (
              <SidebarMenuItem key={track.id}>
                <SidebarMenuButton
                  onClick={() => handleTrackClick(track.id)}
                  className="cursor-pointer"
                >
                  <Music className="h-4 w-4" />
                  <span className="truncate">{track.name}</span>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction>
                      <MoreHorizontal />
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem
                      onClick={() => handleDeleteTrack(track.id)}
                      className="cursor-pointer"
                    >
                      <Trash />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
};

export default AppSidebarContent;
