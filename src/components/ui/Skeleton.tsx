interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-slate-900/80 rounded-md animate-pulse ${className}`} />
  );
}
