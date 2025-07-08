import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../utils/api';

function Messaging() {
  const [messages, setMessages] = useState([]);
  const [recipientUsername, setRecipientUsername] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_ENDPOINTS.MESSAGES.LIST, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      setError('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setSuccess('');

    try {
      if (!privateKeyFile) {
        setError('Please select your private key file');
        setSending(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const formData = new FormData();
          formData.append('recipientUsername', recipientUsername);
          formData.append('content', messageContent);
          formData.append('privateKey', privateKeyFile);

          await axios.post(API_ENDPOINTS.MESSAGES.SEND, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`
            }
          });

          setSuccess('Message sent successfully!');
          setRecipientUsername('');
          setMessageContent('');
          setPrivateKeyFile(null);
          fetchMessages(); // Refresh messages
          
          setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to send message');
        } finally {
          setSending(false);
        }
      };
      reader.readAsText(privateKeyFile);
    } catch (err) {
      setError('Failed to read private key file');
      setSending(false);
    }
  };

  const handleDecryptMessage = async (messageId) => {
    const message = messages.find(m => m._id === messageId);
    if (!message || !privateKeyFile) {
      setError('Please select your private key file first');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await axios.post(API_ENDPOINTS.MESSAGES.DECRYPT(messageId), 
            { privateKey: reader.result },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          setMessages(messages.map(m => 
            m._id === messageId 
              ? { ...m, decryptedContent: res.data.decryptedContent, isDecrypted: true }
              : m
          ));
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to decrypt message');
        }
      };
      reader.readAsText(privateKeyFile);
    } catch (err) {
      setError('Failed to read private key file');
    }
  };

  return (
    <div className="min-h-screen gradient-bg py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl font-bold text-white text-shadow mb-4">Secure Messaging</h1>
          <p className="text-xl text-white/80">Send and receive encrypted messages</p>
        </div>

        {/* Send Message Section */}
        <div className="card mb-8 animate-slide-up">
          <div className="flex items-center mb-6">
            <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gradient">Send Message</h2>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl animate-slide-up">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl animate-slide-up">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-600">{success}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Username
                </label>
                <input
                  id="recipient"
                  type="text"
                  placeholder="Enter recipient's username"
                  value={recipientUsername}
                  onChange={(e) => setRecipientUsername(e.target.value)}
                  className="input-field focus-ring"
                  required
                />
              </div>

              <div>
                <label htmlFor="privateKey" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Private Key File
                </label>
                <input
                  id="privateKey"
                  type="file"
                  onChange={(e) => setPrivateKeyFile(e.target.files[0])}
                  className="input-field focus-ring file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  accept=".pem,.key,.txt"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message Content
              </label>
              <textarea
                id="message"
                placeholder="Type your secure message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={8}
                className="input-field focus-ring resize-none custom-scrollbar"
                required
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={sending}
                className="btn-primary w-full py-4 text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                {sending ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </div>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Secure Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Messages Section */}
        <div className="card animate-slide-up" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-4.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gradient">Received Messages</h2>
            </div>
            <button
              onClick={fetchMessages}
              disabled={loading}
              className="btn-secondary bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-indigo-300"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto h-24 w-24 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-4.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-500">You haven't received any messages yet. Messages sent to you will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={message._id} className="message-card animate-slide-up" style={{animationDelay: `${0.1 * index}s`}}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          From: {message.senderId?.username || 'Unknown'}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      message.isDecrypted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {message.isDecrypted ? 'Decrypted' : 'Encrypted'}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    {message.isDecrypted ? (
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.decryptedContent}</p>
                    ) : (
                      <div className="text-center py-4">
                        <svg className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <p className="text-sm text-gray-500">Message is encrypted</p>
                        <p className="text-xs text-gray-400 mt-1">Use your private key to decrypt</p>
                      </div>
                    )}
                  </div>

                  {!message.isDecrypted && (
                    <button
                      onClick={() => handleDecryptMessage(message._id)}
                      className="btn-secondary w-full py-2 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                    >
                      <svg className="h-4 w-4 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      Decrypt Message
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Messaging;
