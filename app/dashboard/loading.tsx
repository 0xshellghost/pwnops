export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse p-4">
      <div className="h-8 bg-bg-card rounded-md w-48 mb-6 border border-border"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="h-32 bg-bg-card rounded-xl border border-border"></div>
        <div className="h-32 bg-bg-card rounded-xl border border-border"></div>
        <div className="h-32 bg-bg-card rounded-xl border border-border"></div>
      </div>
      <div className="h-96 bg-bg-card rounded-xl border border-border w-full"></div>
    </div>
  );
}
