import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../utils/api';
import ClientCrypto from '../utils/crypto';

function Messaging({ token }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const privateKey = localStorage.getItem('privateKey');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_ENDPOINTS.MESSAGE.LIST);
      setMessages(res.data.data || []);
    } catch (err) {
      setError('Failed to fetch messages: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !recipient.trim() || !privateKey) {
      setError('Please enter a message, recipient, and ensure you are logged in');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      // Get recipient's public key
      const recipientRes = await axios.get(API_ENDPOINTS.AUTH.PUBLIC_KEY(recipient));
      const recipientPublicKey = recipientRes.data.data.publicKey;

      // Encrypt message with recipient's public key
      const encryptedMessage = ClientCrypto.encryptWithPublicKey(newMessage, recipientPublicKey);

      // Create digital signature
      const signature = ClientCrypto.createSignature(newMessage, privateKey);

      const res = await axios.post(API_ENDPOINTS.MESSAGE.SEND, {
        recipient,
        encryptedContent: encryptedMessage,
        signature,
        privateKey
      });

      setSuccess(`Message sent to ${recipient} successfully!`);
      setNewMessage('');
      setRecipient('');
      fetchMessages();
    } catch (err) {
      setError('Send failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.delete(API_ENDPOINTS.MESSAGE.DELETE(messageId));
      setSuccess('Message deleted successfully!');
      fetchMessages();
    } catch (err) {
      setError('Delete failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const decryptMessage = (message) => {
    try {
      if (!privateKey) {
        return '[Unable to decrypt - private key not available]';
      }
      return ClientCrypto.decryptWithPrivateKey(message.encryptedContent, privateKey);
    } catch (err) {
      return '[Unable to decrypt - invalid key or corrupted message]';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 text-shadow">Secure Messaging</h1>
        <p className="text-white/80 text-lg">Send and receive encrypted messages securely</p>
      </div>

      {/* Alerts */}
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

      {success && (
        <div className="mb-6 p-4 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl animate-slide-up">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-200">{success}</p>
          </div>
        </div>
      )}

      {/* Send Message Form */}
      <div className="glass-card mb-8">
        <div className="flex items-center mb-6">
          <svg className="h-6 w-6 text-blue-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <h2 className="text-xl font-semibold text-white">Send New Message</h2>
        </div>

        <form onSubmit={handleSendMessage} className="space-y-4">
          <div>
            <label htmlFor="recipient" className="block text-sm font-medium text-white/90 mb-2">
              Recipient Username
            </label>
            <input
              id="recipient"
              type="text"
              placeholder="Enter recipient's username"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="input-field focus-ring"
              required
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-white/90 mb-2">
              Message
            </label>
            <textarea
              id="message"
              placeholder="Type your message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={4}
              className="input-field focus-ring resize-none"
              required
            />
            <p className="mt-2 text-xs text-white/60">
              Message will be encrypted end-to-end and digitally signed
            </p>
          </div>

          <button
            type="submit"
            disabled={sending || !newMessage.trim() || !recipient.trim()}
            className="btn-primary w-full py-3"
          >
            {sending ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Encrypting & Sending...
              </div>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Message
              </>
            )}
          </button>
        </form>
      </div>

      {/* Messages List */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <svg className="h-6 w-6 text-green-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2 className="text-xl font-semibold text-white">Messages</h2>
          </div>
          <button
            onClick={fetchMessages}
            disabled={loading}
            className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
            title="Refresh"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <svg className="h-12 w-12 text-white/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-white/60">No messages yet</p>
            </div>
          ) : (
            messages.map((message) => {
              const isSentByUser = message.sender?.username === user.username || message.sender === user.username;
              const decryptedContent = decryptMessage(message);
              
              return (
                <div
                  key={message._id}
                  className={`relative p-4 rounded-lg border ${
                    isSentByUser
                      ? 'bg-blue-500/20 border-blue-400/30 ml-8'
                      : 'bg-white/5 border-white/20 mr-8'
                  } hover:bg-white/10 transition-all duration-200`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isSentByUser ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        <span className="text-white text-sm font-medium">
                          {isSentByUser 
                            ? user.username?.charAt(0).toUpperCase() 
                            : (message.sender?.username || message.sender)?.charAt(0).toUpperCase()
                          }
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {isSentByUser ? 'You' : (message.sender?.username || message.sender)}
                        </p>
                        <p className="text-white/60 text-xs">
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    {isSentByUser && (
                      <button
                        onClick={() => handleDeleteMessage(message._id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-white/10 transition-colors duration-200"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="mb-3">
                    <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                      {decryptedContent}
                    </p>
                  </div>

                  {!isSentByUser && (
                    <div className="text-xs text-white/50">
                      <p>To: {message.recipient?.username || message.recipient}</p>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-white/40 mt-2">
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.018-4.118a3.508 3.508 0 00-4.95 0L5.36 15.49a3.508 3.508 0 004.95 4.95l5.708-5.707a3.508 3.508 0 000-4.95z" />
                      </svg>
                      <span>Encrypted</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Verified</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Messaging;
