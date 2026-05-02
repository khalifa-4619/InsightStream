import React from 'react';

export const SkeletonBox = ({ className = '' }) => (
  <div className={`bg-slate-800 rounded animate-pulse ${className}`} />
);

export const TableSkeleton = ({ rows = 4, cols = 3 }) => (
  <div className="space-y-3 p-6">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <SkeletonBox key={j} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
    <SkeletonBox className="h-6 w-2/3" />
    <SkeletonBox className="h-4 w-full" />
    <SkeletonBox className="h-4 w-5/6" />
    <div className="flex gap-3">
      <SkeletonBox className="h-10 w-20 rounded-lg" />
      <SkeletonBox className="h-10 w-20 rounded-lg" />
    </div>
  </div>
);

export const AnalyticsSkeleton = () => (
  <div className="space-y-6 p-6">
    {/* Score card skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SkeletonBox className="h-32 rounded-2xl" />
      <SkeletonBox className="h-32 rounded-2xl md:col-span-2" />
    </div>
    <SkeletonBox className="h-8 w-40" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SkeletonBox className="h-48 rounded-2xl" />
      <SkeletonBox className="h-48 rounded-2xl" />
    </div>
  </div>
);