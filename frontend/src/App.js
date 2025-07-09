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

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (!token) return null;

  return (
    <nav className="bg-white/95 backdrop-blur-lg shadow-xl border-b border-white/20 sticky top-0 z-50 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3 shadow-lg animate-float">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gradient">SecureShare</h1>
            </div>
            <div className="hidden md:ml-10 md:flex md:space-x-3">
              <Link
                to="/files"
                className={`nav-link group ${
                  location.pathname === '/files' ? 'active' : ''
                }`}
              >
                <div className="w-6 h-6 mr-2 flex items-center justify-center rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-all duration-200">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                Files
              </Link>
              <Link
                to="/messages"
                className={`nav-link group ${
                  location.pathname === '/messages' ? 'active' : ''
                }`}
              >
                <div className="w-6 h-6 mr-2 flex items-center justify-center rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-all duration-200">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                Messages
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="h-4 w-4 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
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
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center animate-bounce-in">
          <div className="loading-spinner mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading SecureShare</h2>
          <p className="text-white/80">Preparing your secure environment...</p>
        </div>
      </div>
    );
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
