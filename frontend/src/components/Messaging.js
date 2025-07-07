import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Messaging({ token }) {
  const [recipientUsername, setRecipientUsername] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messages, setMessages] = useState([]);
  const [privateKeyFile, setPrivateKeyFile] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/message/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, [token]);

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const privateKey = reader.result;
        await axios.post('http://localhost:5000/api/message/send', {
          recipientUsername,
          content: messageContent,
          privateKey
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Message sent successfully');
        setRecipientUsername('');
        setMessageContent('');
      };
      reader.readAsText(privateKeyFile);
    } catch (err) {
      alert('Message sending failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const handleView = async (messageId) => {
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const privateKey = reader.result;
        const res = await axios.post(`http://localhost:5000/api/message/view/${messageId}`, { privateKey }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert(`Message: ${res.data.content}`);
      };
      reader.readAsText(privateKeyFile);
    } catch (err) {
      alert('Message viewing failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl mb-4">Send Messages</h2>
      <form onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Recipient Username"
          value={recipientUsername}
          onChange={(e) => setRecipientUsername(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <textarea
          placeholder="Message Content"
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <input
          type="file"
          onChange={(e) => setPrivateKeyFile(e.target.files[0])}
          className="w-full p-2 mb-4 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded">
          Send Message
        </button>
      </form>
      <h3 className="text-xl mt-6 mb-4">Received Messages</h3>
      <ul>
        {messages.map(message => (
          <li key={message._id} className="p-2 border-b">
            From: {message.senderId.username} <button onClick={() => handleView(message._id)} className="ml-4 p-1 bg-green-600 text-white rounded">View</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Messaging;
