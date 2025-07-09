import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../utils/api';
import ClientCrypto from '../utils/crypto';

function Login({ setToken }) {
  const [username, setUsername] = useState('');
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (!privateKeyFile) {
        setError('Please select a private key file');
        setLoading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const privateKey = reader.result;
          
          // Validate private key format
          if (!ClientCrypto.isValidPEM(privateKey, 'PRIVATE KEY')) {
            setError('Invalid private key format');
            setLoading(false);
            return;
          }

          // Step 1: Get challenge from server
          const challengeRes = await axios.post(API_ENDPOINTS.AUTH.CHALLENGE);
          const challenge = challengeRes.data.challenge;

          // Step 2: Sign challenge with private key
          const signature = ClientCrypto.signChallenge(challenge, privateKey);

          // Step 3: Send login request with username, challenge, and signature
          const loginRes = await axios.post(API_ENDPOINTS.AUTH.LOGIN, {
            username,
            challenge,
            signature
          });

          // Store token and user data
          const token = loginRes.data.data.token;
          const userData = loginRes.data.data.user;
          
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('privateKey', privateKey); // Store for file operations
          
          setToken(token);
          navigate('/files');
        } catch (err) {
          console.error('Login error:', err);
          setError(err.response?.data?.error || 'Login failed');
        } finally {
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('Error reading private key file');
        setLoading(false);
      };
      
      reader.readAsText(privateKeyFile);
    } catch (err) {
      setError('Error processing login request');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10 animate-slide-up">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-lg border border-white/30 shadow-2xl animate-bounce-in">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-4xl font-extrabold text-white text-shadow">
            Welcome Back
          </h2>
          <p className="mt-2 text-lg text-white/80">
            Sign in to your secure file sharing account
          </p>
        </div>
        
        <div className="glass-card">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl animate-slide-up">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-200">{error}</p>
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
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field focus-ring"
                required
              />
            </div>
            
            <div>
              <label htmlFor="privateKey" className="block text-sm font-medium text-white/90 mb-2">
                Private Key File
              </label>
              <div className="relative">
                <input
                  id="privateKey"
                  type="file"
                  onChange={(e) => setPrivateKeyFile(e.target.files[0])}
                  className="input-field focus-ring file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  accept=".pem,.key,.txt"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-white/60">
                Upload the private key file downloaded during registration
              </p>
            </div>
            
            <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-200 mb-1">Security Notice</h4>
                  <p className="text-xs text-yellow-300/80">
                    Your private key is processed locally and used for cryptographic authentication. 
                    It never leaves your device in plain text.
                  </p>
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-lg font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </div>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-white/70">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-white hover:text-blue-200 transition duration-200 underline decoration-2 underline-offset-4">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
