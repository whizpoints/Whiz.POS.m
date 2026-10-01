import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading data...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full gap-4 animate-in fade-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-sky-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
        <Loader2 className="w-10 h-10 animate-spin text-sky-500 relative z-10" />
      </div>
      <p className="text-[15px] font-medium text-slate-500 tracking-wide animate-pulse">{message}</p>
    </div>
  );
}
