import React, { useState } from 'react';

const FloatingActionButton = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action items */}
      <div className={`flex flex-col items-end space-y-3 mb-4 transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {actions.map((action, index) => (
          <div key={index} className="flex items-center group">
            {/* Label */}
            <div className="mr-4 px-3 py-2 bg-black/80 text-white text-sm rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              {action.label}
            </div>
            
            {/* Action button */}
            <button
              onClick={action.onClick}
              className={`w-12 h-12 rounded-full shadow-lg backdrop-blur-sm border border-white/20 flex items-center justify-center transform transition-all duration-200 hover:scale-110 hover:shadow-xl ${action.bgColor || 'bg-white/10'} ${action.hoverColor || 'hover:bg-white/20'}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {action.icon}
            </button>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={toggleMenu}
        className={`w-16 h-16 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 rounded-full shadow-2xl flex items-center justify-center transform transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-blue-500/25 ${
          isOpen ? 'rotate-45' : 'rotate-0'
        }`}
      >
        <svg 
          className={`w-8 h-8 text-white transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {/* Ripple effect on click */}
      <div className="absolute inset-0 rounded-full animate-ping bg-blue-500/20 pointer-events-none"></div>
    </div>
  );
};

export default FloatingActionButton;