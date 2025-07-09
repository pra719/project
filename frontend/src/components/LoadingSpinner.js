import React from 'react';

const LoadingSpinner = ({ size = 'md', color = 'white' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} relative`}>
        {/* Outer rotating ring */}
        <div className={`absolute inset-0 border-2 border-${color}/20 rounded-full`}></div>
        <div className={`absolute inset-0 border-2 border-transparent border-t-${color} rounded-full animate-spin`}></div>
        
        {/* Inner pulsing dot */}
        <div className={`absolute inset-2 bg-${color}/60 rounded-full animate-pulse`}></div>
        
        {/* Center sparkle */}
        <div className={`absolute inset-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-ping`}></div>
      </div>
    </div>
  );
};

export const PageLoader = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900/90 via-purple-900/90 to-pink-900/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card p-8 text-center">
        <LoadingSpinner size="xl" />
        <p className="text-white/80 mt-4 font-medium">Loading SecureShare...</p>
        <div className="mt-2 w-32 h-1 bg-white/20 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-loading-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;