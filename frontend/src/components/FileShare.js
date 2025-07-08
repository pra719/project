import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { API_ENDPOINTS } from '../utils/api';

function FileShare({ token }) {
  const [recipientUsername, setRecipientUsername] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [files, setFiles] = useState([]);
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.FILE.LIST, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFiles(res.data);
      } catch (err) {
        setError('Failed to load files');
        console.error(err);
      }
    };
    if (token) {
      fetchFiles();
    }
  }, [token]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    setError('');
    setSuccess('');
    
    try {
      if (!privateKeyFile) {
        setError('Please select a private key file');
        setUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const privateKey = reader.result;
          await axios.post(API_ENDPOINTS.FILE.UPLOAD, {
            recipientUsername,
            fileContent,
            fileName,
            privateKey
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSuccess('File uploaded successfully!');
          setRecipientUsername('');
          setFileContent('');
          setFileName('');
          setPrivateKeyFile(null);
          // Refresh files list
          const res = await axios.get(API_ENDPOINTS.FILE.LIST, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setFiles(res.data);
        } catch (err) {
          setError(err.response?.data?.error || 'File upload failed');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsText(privateKeyFile);
    } catch (err) {
      setError('Error reading private key file');
      setUploading(false);
    }
  };

  const handleDownload = async (fileId) => {
    if (!privateKeyFile) {
      setError('Please select a private key file to download files');
      return;
    }

    setDownloading(prev => ({ ...prev, [fileId]: true }));
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const privateKey = reader.result;
          const res = await axios.post(API_ENDPOINTS.FILE.DOWNLOAD(fileId), { privateKey }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const blob = new Blob([res.data.content], { type: 'text/plain;charset=utf-8' });
          saveAs(blob, res.data.filename || `decrypted_file_${fileId}.txt`);
          setSuccess('File downloaded successfully!');
        } catch (err) {
          setError(err.response?.data?.error || 'File download failed');
        } finally {
          setDownloading(prev => ({ ...prev, [fileId]: false }));
        }
      };
      reader.readAsText(privateKeyFile);
    } catch (err) {
      setError('Error reading private key file');
      setDownloading(prev => ({ ...prev, [fileId]: false }));
    }
  };

  const handleFileContentChange = (e) => {
    setFileContent(e.target.value);
    if (!fileName && e.target.value) {
      setFileName(`document_${Date.now()}.txt`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Secure File Sharing</h1>
          <p className="text-gray-600">Share files securely with end-to-end encryption</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Upload File</h2>
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

          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-2">
                  File Name
                </label>
                <input
                  id="filename"
                  type="text"
                  placeholder="Enter file name"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  accept=".pem,.key,.txt"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                File Content
              </label>
              <textarea
                id="content"
                placeholder="Enter or paste your file content here..."
                value={fileContent}
                onChange={handleFileContentChange}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                required
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                {uploading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </div>
                ) : (
                  'Upload File'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Received Files Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center mb-6">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Received Files</h2>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
              <p className="mt-1 text-sm text-gray-500">You haven't received any files yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map(file => (
                <div key={file._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {file.filename || 'Untitled File'}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    From: <span className="font-medium">{file.senderId?.username || 'Unknown'}</span>
                  </p>
                  <button
                    onClick={() => handleDownload(file._id)}
                    disabled={downloading[file._id]}
                    className="w-full py-2 px-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                  >
                    {downloading[file._id] ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Downloading...
                      </div>
                    ) : (
                      'Download'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileShare;
