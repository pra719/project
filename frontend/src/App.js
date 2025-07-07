import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import FileShare from './components/FileShare';
import Messaging from './components/Messaging';
import './styles.css';

function App() {
  const [token, setToken] = useState(null);
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-blue-600 text-white p-4">
          <h1 className="text-2xl">Secure File Sharing</h1>
        </nav>
        <Routes>
          <Route path="/login" element={<Login setToken={setToken} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/files" element={<FileShare token={token} />} />
          <Route path="/messages" element={<Messaging token={token} />} />
          <Route path="/" element={<Login setToken={setToken} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
