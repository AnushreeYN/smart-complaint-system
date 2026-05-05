import React, { useEffect, useState } from 'react';
import { Bell, X, Info } from 'lucide-react';

const NotificationToast = ({ message, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-8 right-8 z-[100] transition-all duration-500 transform ${
      isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-90'
    }`}>
      <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl shadow-indigo-500/20 border border-white/10 flex items-center gap-4 min-w-[320px]">
        <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg">
          <Bell className="w-5 h-5 text-white animate-bounce" />
        </div>
        <div className="flex-1 pr-4">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Real-time Alert</p>
          <p className="text-sm font-medium leading-tight">{message}</p>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
