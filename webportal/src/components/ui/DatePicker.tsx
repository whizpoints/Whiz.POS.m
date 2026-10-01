import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder, className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });
  
  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSelectDate = (date: Date) => {
    onChange(formatDate(date));
    setIsOpen(false);
  };

  return (
    <>
      <div 
        className={`${className} w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm flex items-center justify-between cursor-pointer focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-colors`}
        onClick={() => setIsOpen(true)}
      >
        <span className={value ? "text-slate-900 font-medium" : "text-slate-400"}>
          {value || placeholder || "Select date"}
        </span>
        <CalendarIcon className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={handleBackdropClick}
        >
          <div 
            ref={modalRef}
            className="relative w-full max-w-[320px] bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Background Logo */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-[0.12]" 
              style={{ 
                backgroundImage: 'url(/logo.png)', 
                backgroundSize: '70%', 
                backgroundPosition: 'center', 
                backgroundRepeat: 'no-repeat' 
              }} 
            />
            
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white/70 backdrop-blur-md">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                <div className="font-bold text-slate-800 text-base">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</div>
                <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
              </div>
              
              {/* Calendar Grid */}
              <div className="p-5 bg-white/60 backdrop-blur-md">
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {days.map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} className="w-8 h-8 sm:w-9 sm:h-9" />;
                    
                    const isSelected = value && formatDate(date) === value;
                    const isToday = formatDate(date) === formatDate(new Date());
                    
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={(e) => { e.preventDefault(); handleSelectDate(date); }}
                        className={`
                          w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-sm transition-all duration-200
                          ${isSelected 
                            ? 'bg-sky-600 text-white font-bold shadow-lg shadow-sky-200 scale-110 z-10' 
                            : 'text-slate-800 hover:bg-white/80 hover:shadow-sm hover:scale-105 font-medium'
                          }
                          ${!isSelected && isToday ? 'border-2 border-sky-300 font-bold text-sky-700 bg-sky-50/50' : ''}
                        `}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
