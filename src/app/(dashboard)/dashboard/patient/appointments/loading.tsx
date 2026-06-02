import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AppointmentsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Tab skeletons */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-16 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* Card skeletons */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  {i <= 2 && (
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24 rounded-md" />
                      <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
