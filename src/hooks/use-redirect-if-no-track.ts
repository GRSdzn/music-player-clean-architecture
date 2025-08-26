import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTracksStore } from "@/features/player/application/store/tracksStore";

export function useRedirectIfNoTrack() {
  const router = useRouter();
  const { tracks } = useTracksStore();

  useEffect(() => {
    if (tracks.length === 0) {
      router.push("/");
    }
  }, [tracks, router]);
}
