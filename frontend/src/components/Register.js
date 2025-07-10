import React, { useState } from 'react';
import axiosInstance, { testConnectivity } from '../utils/api';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const navigate = useNavigate();

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      await testConnectivity();
      setError('✓ Connection successful! Backend is reachable.');
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      setError('✗ Connection failed. Please check if the backend is running.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Client-side validation
      if (!username.trim()) {
        setError('Please enter a username');
        setLoading(false);
        return;
      }

      if (username.trim().length < 3) {
        setError('Username must be at least 3 characters long');
        setLoading(false);
        return;
      }

      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username.trim())) {
        setError('Username can only contain letters, numbers, and underscores');
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const res = await axiosInstance.post('/api/auth/register', { 
        username: username.trim(), 
        email: email.trim() 
      });

      if (!res.data.success) {
        setError(res.data.error || 'Registration failed');
        setLoading(false);
        return;
      }
      
      // Create downloads for both private key and certificate
      const privateKeyBlob = new Blob([res.data.data.privateKey], { type: 'text/plain' });
      const certBlob = new Blob([res.data.data.certificate], { type: 'text/plain' });
      
      // Download private key
      const privateKeyUrl = window.URL.createObjectURL(privateKeyBlob);
      const privateKeyLink = document.createElement('a');
      privateKeyLink.href = privateKeyUrl;
      privateKeyLink.download = `${username.trim()}_private_key.pem`;
      privateKeyLink.click();
      window.URL.revokeObjectURL(privateKeyUrl);
      
      // Download certificate with slight delay
      setTimeout(() => {
        const certUrl = window.URL.createObjectURL(certBlob);
        const certLink = document.createElement('a');
        certLink.href = certUrl;
        certLink.download = `${username.trim()}_certificate.pem`;
        certLink.click();
        window.URL.revokeObjectURL(certUrl);
      }, 500);
      
      setSuccess('Registration successful! Your private key and certificate have been downloaded. Please keep them safe.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      console.error('Registration error:', err);
      
      if (err.response) {
        const status = err.response.status;
        const errorMessage = err.response.data?.error || 'Registration failed';
        
        if (status === 409) {
          setError('Username or email already exists. Please choose different ones.');
        } else if (status === 429) {
          setError('Too many registration attempts. Please try again later.');
        } else if (status >= 500) {
          setError('Server error. Please try again later or contact support.');
        } else {
          setError(errorMessage);
        }
      } else if (err.request || err.code === 'NETWORK_ERROR' || err.code === 'ECONNREFUSED') {
        setError('Unable to connect to server. Please check that:\n1. The backend service is running\n2. You can access http://localhost:5000\n3. Your network connection is working');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-20">
          <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
          <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10 animate-slide-up">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-lg border border-white/30 shadow-2xl animate-bounce-in">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="mt-6 text-4xl font-extrabold text-white text-shadow">
            Create Account
          </h2>
          <p className="mt-2 text-lg text-white/80">
            Join SecureShare for encrypted file sharing
          </p>
        </div>
        
        <div className="glass-card">
          {/* Connection Test Button */}
          <div className="mb-4">
            <button
              type="button"
              onClick={testConnection}
              disabled={testingConnection}
              className="w-full py-2 px-4 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg border border-blue-400/30 transition-all duration-200"
            >
              {testingConnection ? 'Testing Connection...' : 'Test Backend Connection'}
            </button>
          </div>

          {error && (
            <div className={`mb-6 p-4 backdrop-blur-sm border rounded-xl animate-slide-up ${
              error.startsWith('✓') ? 'bg-green-500/20 border-green-400/30' : 'bg-red-500/20 border-red-400/30'
            }`}>
              <div className="flex items-start">
                <svg className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                  error.startsWith('✓') ? 'text-green-400' : 'text-red-400'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                    error.startsWith('✓') ? "M5 13l4 4L19 7" : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  } />
                </svg>
                <pre className={`text-sm whitespace-pre-wrap ${
                  error.startsWith('✓') ? 'text-green-200' : 'text-red-200'
                }`}>{error}</pre>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl animate-slide-up">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-200">{success}</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-white/90 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Choose a unique username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field focus-ring"
                disabled={loading}
                required
                minLength="3"
                maxLength="20"
                pattern="[a-zA-Z0-9_]+"
                title="Username can only contain letters, numbers, and underscores"
              />
              <p className="mt-2 text-xs text-white/60">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field focus-ring"
                disabled={loading}
                required
              />
              <p className="mt-2 text-xs text-white/60">
                Used for certificate generation and account recovery
              </p>
            </div>
            
            <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-400/30 rounded-xl p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-200 mb-1">Security Notice</h4>
                  <p className="text-xs text-blue-300/80">
                    Your private key and certificate will be generated and downloaded automatically. 
                    Store them securely - you'll need them to log in and access your files.
                  </p>
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`btn-primary w-full py-4 text-lg font-semibold transition-all duration-300 ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </div>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Create Account
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-white/70">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-white hover:text-blue-200 transition duration-200 underline decoration-2 underline-offset-4">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
