"use client";
import Link from "next/link";
import { SidebarHeader } from "@/components/ui/sidebar";
import { Music } from "lucide-react";
import React from "react";

export const AppSidebarHeader: React.FC = () => {
  return (
    <SidebarHeader className="p-0 border-b-2 border-primary">
      <div className="border-i-b-2 border-primary">
        <Link href="/" className="flex h-16 shrink-0 items-center px-4">
          {/* 2px height line under text */}
          <Music className="h-4 w-4" />
          <span className="text-lg">Audio Editor</span>
        </Link>
      </div>
    </SidebarHeader>
  );
};
