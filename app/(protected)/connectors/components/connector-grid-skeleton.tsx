"use client";

const PLACEHOLDER_COUNT = 4;

export function ConnectorGridSkeleton() {
  return (
    <div>
      {/* Hub placeholder */}
      <div className="relative w-full mb-6 rounded-[2rem] border border-white/60 bg-white/50 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10 px-6 sm:px-10 py-8">
          <div className="relative shrink-0 w-[260px] h-[260px] flex items-center justify-center">
            <div className="w-[196px] h-[196px] rounded-full border-[1.5px] border-dashed border-slate-200 animate-pulse" />
            <div className="absolute w-14 h-14 rounded-full bg-slate-100 animate-pulse" />
          </div>
          <div className="flex-1 w-full space-y-3">
            <div className="h-6 w-56 rounded-lg bg-slate-100 animate-pulse mx-auto lg:mx-0" />
            <div className="h-4 w-full max-w-md rounded-lg bg-slate-100/80 animate-pulse mx-auto lg:mx-0" />
          </div>
          <div className="flex items-center gap-8 shrink-0">
            <div className="h-10 w-12 rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-10 w-12 rounded-lg bg-slate-100 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Card placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
          <div
            key={i}
            className="rounded-[1.75rem] border border-white/60 bg-white/60 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="mt-5 h-4 w-24 rounded bg-slate-100 animate-pulse" />
            <div className="mt-2.5 h-3 w-20 rounded bg-slate-100/80 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
