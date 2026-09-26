import { Skeleton } from "@/components/ui/skeleton";

/** Configurator skeleton: hero, category pills, product grid and the summary panel. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8" role="status" aria-label="A carregar o configurador">
      <Skeleton className="h-10 w-80" />
      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-14 w-96 max-w-full" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-32 rounded-full" />
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-48 rounded-card" />
            ))}
          </div>
        </div>
        <Skeleton className="hidden h-[640px] rounded-panel xl:block" />
      </div>
    </div>
  );
}
