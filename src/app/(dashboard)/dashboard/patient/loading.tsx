import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Welcome Banner Skeleton */}
      <Skeleton className="h-40 w-full rounded-2xl" />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Upcoming Appointments Table Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
          
          {/* Quick Actions Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="flex gap-4">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Next Appointment Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-10 w-full mt-4" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
