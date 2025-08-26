"use client";
import { SidebarFooter } from "@/components/ui/sidebar";
import React from "react";
import { useTracksStore } from "../../application/store/tracksStore";
import { ThemeToggle } from "@/components/theme-toggle";

const AppSidebarFooter: React.FC = () => {
  const { tracks } = useTracksStore();

  return (
    <SidebarFooter>
      <div className="flex items-center justify-between px-2 py-2">
        <div className="text-xs text-muted-foreground">
          {tracks.length} track{tracks.length !== 1 ? "s" : ""} loaded
        </div>
        <ThemeToggle />
      </div>
    </SidebarFooter>
  );
};

export default AppSidebarFooter;
