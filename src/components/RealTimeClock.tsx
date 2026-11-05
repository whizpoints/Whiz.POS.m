import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';

export default function RealTimeClock() {
  const [time, setTime] = useState<Date>(new Date());
  const [is24Hour, setIs24Hour] = useState<boolean>(false);

  useEffect(() => {
    // Synchronize to the nearest second
    const updateTime = () => setTime(new Date());
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: !is24Hour
  });

  const formattedDate = time.toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  const fullDateTooltip = time.toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) + ` • ${formattedTime}`;

  return (
    <div
      onClick={() => setIs24Hour(prev => !prev)}
      title={`${fullDateTooltip} (Click to switch 12h/24h format)`}
      className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-700 shadow-2xs select-none cursor-pointer transition-all duration-150"
    >
      <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
      <span className="text-[11px] font-semibold text-slate-500 hidden md:inline">
        {formattedDate}
      </span>
      <span className="text-slate-300 hidden md:inline">•</span>
      <span className="font-mono text-xs font-bold text-slate-800 tracking-tight">
        {formattedTime}
      </span>
    </div>
  );
}
