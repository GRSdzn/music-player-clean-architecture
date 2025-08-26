export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audio Editor</h1>
        <p className="text-muted-foreground">
          Upload and edit your audio tracks with professional tools.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Upload Tracks</h3>
          <p className="text-sm text-muted-foreground">
            Use the sidebar to upload your audio files
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Edit & Effects</h3>
          <p className="text-sm text-muted-foreground">
            Apply effects, trim, and enhance your audio
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Export</h3>
          <p className="text-sm text-muted-foreground">
            Download your edited tracks in various formats
          </p>
        </div>
      </div>
    </div>
  );
}
