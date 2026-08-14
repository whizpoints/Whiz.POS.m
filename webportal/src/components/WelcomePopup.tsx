import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Laptop, MonitorSmartphone, X } from 'lucide-react';

export default function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show if they haven't seen it before
    const hasSeen = localStorage.getItem('whiz_welcome_seen');
    if (!hasSeen) {
      // Delay slightly for dramatic effect after dashboard loads
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('whiz_welcome_seen', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div className="bg-white max-w-2xl w-full rounded-[2rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
        
        <button 
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <X className="w-6 h-6 text-gray-500" />
        </button>

        <div className="flex flex-col md:flex-row h-full">
          {/* Left Side: Graphic */}
          <div className="w-full md:w-2/5 bg-gradient-to-br from-indigo-600 to-purple-700 p-8 flex flex-col justify-center items-center text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 opacity-20"></div>
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/20">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3 relative z-10">Welcome to Whiz POS</h2>
            <p className="text-indigo-100 text-sm relative z-10 leading-relaxed">
              You are currently viewing the Cloud Web Portal. This is your master control center.
            </p>
          </div>

          {/* Right Side: Content */}
          <div className="w-full md:w-3/5 p-8 sm:p-10 flex flex-col justify-center bg-gray-50">
            <h3 className="text-xl font-bold text-gray-900 mb-6">How the ecosystem works</h3>
            
            <div className="space-y-6 mb-8">
              <div className="flex gap-4">
                <div className="bg-blue-100 p-3 rounded-xl h-fit">
                  <Laptop className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">1. This Cloud Portal</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Use this website to view reports, manage multiple stores, and change master settings from anywhere in the world.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="bg-purple-100 p-3 rounded-xl h-fit">
                  <MonitorSmartphone className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">2. The Local Server & POS</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Download our Desktop App to ring up sales. When you launch it for the first time, click "Link Web Account" and enter your Permanent API Key (found in your Settings).
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleClose}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
