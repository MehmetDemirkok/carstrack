"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "./panel";

export function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4 sm:gap-5" aria-busy="true" aria-label="Analitik yükleniyor">
      <div className="col-span-12 lg:col-span-8">
        <Panel padded={false} className="p-6 sm:p-8 space-y-8">
          <div className="flex flex-col sm:flex-row gap-8 items-center">
            <Skeleton className="h-[172px] w-[172px] rounded-full shrink-0" />
            <div className="flex-1 space-y-3 w-full">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-72 max-w-full" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-border/40 space-y-3">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-12 w-48" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          </div>
        </Panel>
      </div>

      <div className="col-span-12 lg:col-span-4">
        <Panel className="space-y-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-40" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 items-center">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </Panel>
      </div>

      <div className="col-span-12 lg:col-span-8">
        <Panel className="space-y-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-[240px] w-full rounded-2xl" />
        </Panel>
      </div>

      <div className="col-span-12 lg:col-span-4">
        <Panel className="space-y-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-full rounded-full" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </Panel>
      </div>
    </div>
  );
}
