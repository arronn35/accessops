export default function AppLoading() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="animate-pulse space-y-6" aria-hidden="true">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-md bg-canvas-2" />
            <div className="h-4 w-72 max-w-full rounded-md bg-canvas-2" />
          </div>
          <div className="h-10 w-32 rounded-md bg-canvas-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 rounded-lg bg-canvas-2 ring-1 ring-line" />
          <div className="h-28 rounded-lg bg-canvas-2 ring-1 ring-line" />
          <div className="h-28 rounded-lg bg-canvas-2 ring-1 ring-line" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="h-80 rounded-lg bg-canvas-2 ring-1 ring-line" />
          <div className="h-80 rounded-lg bg-canvas-2 ring-1 ring-line" />
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
