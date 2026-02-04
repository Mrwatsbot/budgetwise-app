export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-48 bg-secondary rounded-lg mb-2" />
        <div className="h-4 w-72 bg-secondary/60 rounded-lg" />
      </div>

      {/* Summary bar skeleton */}
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-20 bg-secondary rounded-xl" />
        ))}
      </div>

      {/* Sankey card skeleton */}
      <div className="bg-secondary rounded-2xl h-[420px]" />

      {/* Two chart cards skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-secondary rounded-2xl h-[380px]" />
        <div className="bg-secondary rounded-2xl h-[380px]" />
      </div>
    </div>
  );
}
