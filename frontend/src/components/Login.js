import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login({ setToken }) {
  const [username, setUsername] = useState('');
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const privateKey = reader.result;
        const res = await axios.post('http://localhost:5000/api/auth/login', { username, privateKey });
        setToken(res.data.token);
        navigate('/files');
      };
      reader.readAsText(privateKeyFile);
    } catch (err) {
      alert('Login failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl mb-4">Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <input
          type="file"
          onChange={(e) => setPrivateKeyFile(e.target.files[0])}
          className="w-full p-2 mb-4 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded">
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
