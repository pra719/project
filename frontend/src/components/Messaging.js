import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../utils/api';

function Messaging({ token }) {
  const [messages, setMessages] = useState([]);
  const [recipientUsername, setRecipientUsername] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.MESSAGE.LIST, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
      } catch (err) {
        setError('Failed to load messages');
        console.error(err);
      }
    };
    if (token) {
      fetchMessages();
    }
  }, [token]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setSuccess('');
    
    try {
      if (!privateKeyFile) {
        setError('Please select a private key file');
        setSending(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const privateKey = reader.result;
          await axios.post(API_ENDPOINTS.MESSAGE.SEND, {
            recipientUsername,
            content: messageContent,
            privateKey
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSuccess('Message sent successfully!');
          setRecipientUsername('');
          setMessageContent('');
          setPrivateKeyFile(null);
          // Refresh messages list
          const res = await axios.get(API_ENDPOINTS.MESSAGE.LIST, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMessages(res.data);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to send message');
        } finally {
          setSending(false);
        }
      };
      reader.readAsText(privateKeyFile);
    } catch (err) {
      setError('Error reading private key file');
      setSending(false);
    }
  };

  const decryptMessage = async (messageId) => {
    if (!privateKeyFile) {
      setError('Please select a private key file to decrypt messages');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const privateKey = reader.result;
          const res = await axios.post(`${API_ENDPOINTS.MESSAGE.LIST}/${messageId}/decrypt`, { privateKey }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Update the specific message in the list
          setMessages(prev => prev.map(msg => 
            msg._id === messageId 
              ? { ...msg, decryptedContent: res.data.content, isDecrypted: true }
              : msg
          ));
          setSuccess('Message decrypted successfully!');
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to decrypt message');
        }
      };
      reader.readAsText(privateKeyFile);
    } catch (err) {
      setError('Error reading private key file');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Secure Messaging</h1>
          <p className="text-gray-600">Send and receive encrypted messages securely</p>
        </div>

        {/* Send Message Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Send Message</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="privateKey" className="block text-sm font-medium text-gray-700 mb-2">
                  Private Key File
                </label>
                <input
                  id="privateKey"
                  type="file"
                  onChange={(e) => setPrivateKeyFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {sending ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </div>
              ) : (
                'Send Message'
              )}
            </button>
          </form>
        </div>

        {/* Messages Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center mb-6">
            <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-4.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-4.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
              <p className="mt-1 text-sm text-gray-500">You haven't received any messages yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div key={message._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-gray-600">
                          {message.senderId?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {message.senderId?.username || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {!message.isDecrypted && (
                      <button
                        onClick={() => decryptMessage(message._id)}
                        className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-100 rounded-full hover:bg-indigo-200 transition duration-200"
                      >
                        Decrypt
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-4">
                    {message.isDecrypted ? (
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {message.decryptedContent}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        Message encrypted. Select a private key file and click "Decrypt" to view.
                      </p>
                    )}
                  </div>
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
