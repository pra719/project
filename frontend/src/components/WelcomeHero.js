import React from 'react';
import { Link } from 'react-router-dom';

const WelcomeHero = () => {
  return (
    <div className="relative overflow-hidden min-h-screen flex items-center justify-center gradient-bg">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 bg-white/20 rounded-full animate-float`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Hero Badge */}
          <div className="inline-flex items-center px-6 py-3 mb-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full shadow-lg animate-fade-in">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-white/90 font-medium">End-to-End Encrypted</span>
          </div>

          {/* Main Title */}
          <h1 className="hero-title mb-6 animate-fade-in animation-delay-200">
            SecureShare
          </h1>
          
          {/* Subtitle */}
          <p className="hero-subtitle max-w-3xl mx-auto mb-8 animate-fade-in animation-delay-400">
            Share files and messages with military-grade encryption. 
            <br />
            <span className="text-blue-300">PKI authentication • Digital signatures • Zero-knowledge architecture</span>
          </p>

          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-4 mb-12 animate-fade-in animation-delay-600">
            <div className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-white/80 text-sm">256-bit AES Encryption</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl">
              <div className="w-3 h-3 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-white/80 text-sm">RSA Key Exchange</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl">
              <div className="w-3 h-3 bg-purple-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-white/80 text-sm">Digital Signatures</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in animation-delay-800">
            <Link 
              to="/register" 
              className="group relative px-10 py-5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white font-semibold rounded-2xl shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 transition-all duration-300 flex items-center overflow-hidden"
            >
              <span className="relative z-10">Get Started Free</span>
              <svg className="ml-3 h-5 w-5 transform transition-transform group-hover:translate-x-1 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
            
            <Link 
              to="/login" 
              className="px-10 py-5 bg-white/10 backdrop-blur-lg border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105 flex items-center"
            >
              <span>Sign In</span>
              <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto animate-fade-in animation-delay-1000">
            <div className="text-center">
              <div className="feature-icon mx-auto mb-4 animate-glow">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Zero-Knowledge</h3>
              <p className="text-white/70">Your data is encrypted before it leaves your device. We never see your content.</p>
            </div>
            
            <div className="text-center">
              <div className="feature-icon mx-auto mb-4 animate-glow animation-delay-200">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Military Grade</h3>
              <p className="text-white/70">256-bit AES encryption with RSA key exchange ensures maximum security.</p>
            </div>
            
            <div className="text-center">
              <div className="feature-icon mx-auto mb-4 animate-glow animation-delay-400">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Lightning Fast</h3>
              <p className="text-white/70">Optimized encryption algorithms ensure fast file transfers without compromising security.</p>
            </div>
          </div>

          {/* Security badges */}
          <div className="mt-16 flex flex-wrap justify-center gap-6 animate-fade-in animation-delay-1200">
            <div className="flex items-center px-4 py-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg">
              <span className="text-white/60 text-sm font-mono">PKI</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg">
              <span className="text-white/60 text-sm font-mono">AES-256</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg">
              <span className="text-white/60 text-sm font-mono">RSA-4096</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg">
              <span className="text-white/60 text-sm font-mono">SHA-512</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeHero;