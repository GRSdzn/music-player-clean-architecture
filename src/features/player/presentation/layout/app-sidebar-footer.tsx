"use client";
import { SidebarFooter } from "@/components/ui/sidebar";
import React from "react";
import { useTracksStore } from "../../application/store/tracksStore";

const AppSidebarFooter: React.FC = () => {
  const { tracks } = useTracksStore();

  return (
    <SidebarFooter>
      <div className="text-xs text-muted-foreground px-2">
        {tracks.length} track{tracks.length !== 1 ? "s" : ""} loaded
      </div>
    </SidebarFooter>
  );
};

export default AppSidebarFooter;
