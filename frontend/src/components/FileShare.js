import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';

function FileShare({ token }) {
  const [recipientUsername, setRecipientUsername] = useState('');
  const [fileContent, setFileContent] = useState('');
  constწ
  const [files, setFiles] = useState([]);
  const [privateKeyFile, setPrivateKeyFile] = useState(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/file/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFiles(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFiles();
  }, [token]);

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const privateKey = reader.result;
        await axios.post('http://localhost:5000/api/file/upload', {
          recipientUsername,
          fileContent,
          privateKey
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('File uploaded successfully');
        setRecipientUsername('');
        setFileContent('');
      };
      reader.readAsText(privateKeyFile);
    } catch (err) {
      alert('File upload failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const handleDownload = async (fileId) => {
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const privateKey = reader.result;
        const res = await axios.post(`http://localhost:5000/api/file/download/${fileId}`, { privateKey }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const blob = new Blob([res.data.content], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `decrypted_file_${fileId}.txt`);
      };
      reader.readAsText(privateKeyFile);
    } catch (err) {
      alert('File download failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl mb-4">Share Files</h2>
      <form onSubmit={handleUpload}>
        <input
          type="text"
          placeholder="Recipient Username"
          value={recipientUsername}
          onChange={(e) => setRecipientUsername(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <textarea
          placeholder="File Content"
          value={fileContent}
          onChange={(e) => setFileContent(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <input
          type="file"
          onChange={(e) => setPrivateKeyFile(e.target.files[0])}
          className="w-full p-2 mb-4 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded">
          Upload File
        </button>
      </form>
      <h3 className="text-xl mt-6 mb-4">Received Files</h3>
      <ul>
        {files.map(file => (
          <li key={file._id} className="p-2 border-b">
            From: {file.senderId.username} <button onClick={() => handleDownload(file._id)} className="ml-4 p-1 bg-green-600 text-white rounded">Download</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FileShare;
