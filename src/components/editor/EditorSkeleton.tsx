import React from 'react';

export default function EditorSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden animate-pulse">
      {/* Toolbar skeleton */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 h-[53px]">
        <div className="w-9 h-9 bg-slate-200 rounded-lg" />
        <div className="w-8 h-8 bg-slate-200 rounded-lg" />
        <div className="w-40 h-6 bg-slate-200 rounded" />
        <div className="flex-1" />
        <div className="w-20 h-8 bg-slate-200 rounded-lg" />
        <div className="w-24 h-8 bg-slate-200 rounded-lg" />
      </div>

      {/* Element toolbar skeleton */}
      <div className="h-10 bg-white border-b border-slate-200 px-3 flex items-center gap-2">
        <div className="w-16 h-6 bg-slate-100 rounded" />
        <div className="w-16 h-6 bg-slate-100 rounded" />
        <div className="w-16 h-6 bg-slate-100 rounded" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Slide list skeleton */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 p-4">
          <div className="w-full h-8 bg-slate-200 rounded-lg mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-full aspect-[16/9] bg-slate-200 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Canvas skeleton */}
        <div className="flex-1 flex items-center justify-center bg-slate-100">
          <div className="bg-white rounded-lg shadow-lg" style={{ width: 640, height: 360 }}>
            <div className="h-full flex flex-col p-8 gap-4">
              <div className="w-3/4 h-8 bg-slate-200 rounded" />
              <div className="w-1/2 h-4 bg-slate-100 rounded" />
              <div className="flex-1 space-y-3 mt-4">
                <div className="w-full h-3 bg-slate-100 rounded" />
                <div className="w-5/6 h-3 bg-slate-100 rounded" />
                <div className="w-4/6 h-3 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Right panel skeleton */}
        <div className="w-14 bg-white border-l border-slate-200 flex flex-col items-center py-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-10 h-10 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
