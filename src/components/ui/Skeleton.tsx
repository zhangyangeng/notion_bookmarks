import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export function WidgetSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("widget-card p-4 flex flex-col justify-between rounded-xl border border-border/40 bg-card/80 shadow-sm backdrop-blur-sm", className)}>
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function HotNewsSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("widget-card p-4 flex flex-col rounded-xl border border-border/40 bg-card/80 shadow-sm backdrop-blur-sm", className)}>
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-24" />
            </div>
            <div className="space-y-3 flex-1 overflow-hidden">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="h-5 w-4 shrink-0" />
                        <div className="space-y-1 flex-1">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-12" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export { Skeleton };
