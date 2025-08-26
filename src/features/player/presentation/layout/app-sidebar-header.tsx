"use client";
import Link from "next/link";
import { SidebarHeader } from "@/components/ui/sidebar";
import { Music } from "lucide-react";
import React from "react";

export const AppSidebarHeader: React.FC = () => {
  return (
    <SidebarHeader className="p-0">
      <Link
        href="/"
        className="flex h-16 shrink-0 items-center px-4 text-foreground hover:text-primary transition-colors"
      >
        <Music className="h-4 w-4 mr-2" />
        <span className="text-lg font-medium">Audio Editor</span>
      </Link>
    </SidebarHeader>
  );
};
