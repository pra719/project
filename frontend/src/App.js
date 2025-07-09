import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import FileShare from './components/FileShare';
import Messaging from './components/Messaging';
import NotificationSystem from './components/NotificationSystem';
import WelcomeHero from './components/WelcomeHero';
import './styles.css';

function Navigation({ token, setToken }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    navigate('/login');
    setMobileMenuOpen(false);
  };

  if (!token) return null;

  const navItems = [
    {
      path: '/files',
      name: 'Files',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      color: 'blue'
    },
    {
      path: '/messages',
      name: 'Messages',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'green'
    }
  ];

  return (
    <nav className="nav-gradient sticky top-0 z-50 animate-slide-down">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center mr-3 shadow-glow animate-float">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black text-gradient">SecureShare</h1>
                <p className="text-xs text-gray-500 font-medium">Secure File & Message Platform</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-10 md:flex md:space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                    location.pathname === item.path 
                      ? 'bg-white/20 text-white shadow-lg backdrop-blur-lg' 
                      : 'text-gray-700 hover:text-white hover:bg-white/10 hover:backdrop-blur-lg'
                  }`}
                >
                  <div className={`w-6 h-6 mr-3 flex items-center justify-center rounded-lg transition-all duration-200 ${
                    location.pathname === item.path 
                      ? `bg-${item.color}-500/30 text-${item.color}-100` 
                      : `bg-${item.color}-500/10 text-${item.color}-600 group-hover:bg-${item.color}-500/20 group-hover:text-${item.color}-100`
                  }`}>
                    {item.icon}
                  </div>
                  {item.name}
                  {location.pathname === item.path && (
                    <div className="ml-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse-soft"></div>
                  )}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden md:flex items-center space-x-3 bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2 border border-white/20">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center shadow-glow-green">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-700">User</p>
                <p className="text-xs text-gray-500">Online</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="group bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-glow-red transform hover:scale-105 hover:-translate-y-0.5"
            >
              <svg className="h-4 w-4 mr-2 inline-block group-hover:rotate-12 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/20 transition-all duration-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden animate-slide-down">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white/95 backdrop-blur-lg border-t border-white/20">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
                  location.pathname === item.path 
                    ? 'bg-blue-500/20 text-blue-700 shadow-lg' 
                    : 'text-gray-700 hover:text-blue-700 hover:bg-blue-500/10'
                }`}
              >
                <div className={`w-6 h-6 mr-3 flex items-center justify-center rounded-lg transition-all duration-200 ${
                  location.pathname === item.path 
                    ? `bg-${item.color}-500/30 text-${item.color}-700` 
                    : `bg-${item.color}-500/10 text-${item.color}-600 group-hover:bg-${item.color}-500/20`
                }`}>
                  {item.icon}
                </div>
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <div className="text-center animate-bounce-in">
        <div className="relative">
          <div className="loading-spinner mx-auto mb-6 w-16 h-16 border-4"></div>
          <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-transparent border-t-blue-400 rounded-full animate-spin"></div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white mb-2 animate-pulse-soft">Loading SecureShare</h2>
          <p className="text-white/80 font-medium">Preparing your secure environment...</p>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce animation-delay-200"></div>
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce animation-delay-400"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved token on app start
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
    }
    
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="min-h-screen gradient-bg">
        <Navigation token={token} setToken={setToken} />
        <main className="animate-fade-in">
          <Routes>
            <Route 
              path="/login" 
              element={!token ? <Login setToken={setToken} /> : <Navigate to="/files" />} 
            />
            <Route 
              path="/register" 
              element={!token ? <Register /> : <Navigate to="/files" />} 
            />
            <Route 
              path="/files" 
              element={token ? <FileShare token={token} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/messages" 
              element={token ? <Messaging token={token} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/" 
              element={!token ? <WelcomeHero /> : <Navigate to="/files" />} 
            />
          </Routes>
        </main>
        <NotificationSystem />
      </div>
    </Router>
  );
}

export default App;
