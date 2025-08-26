import React from "react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r ">
      <div className="text-center">
        <div className="relative">
          <div className="h-32 w-32 rounded-full border-t-8 border-b-8 border-white animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="h-16 w-16 rounded-full border-t-8 border-b-8 border-purple-300  animate-ping"></div>
          </div>
        </div>
        <h2 className="mt-8 text-3xl font-bold text-white">Loading...</h2>
        <p className="mt-2 text-white/80">
          Please wait while we prepare your audio experience
        </p>
      </div>
    </div>
  );
}
