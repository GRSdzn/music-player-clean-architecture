"use client";
import Link from "next/link";
import { SidebarHeader } from "@/components/ui/sidebar";
import { Music } from "lucide-react";
import React from "react";

export const AppSidebarHeader: React.FC = () => {
  return (
    <SidebarHeader>
      <Link href="/" className="flex items-center gap-2 font-semibold px-2">
        <Music className="h-4 w-4" />
        <span className="text-lg">Audio Editor</span>
      </Link>
    </SidebarHeader>
  );
};
