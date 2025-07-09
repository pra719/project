import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../utils/api';
import ClientCrypto from '../utils/crypto';

function FileShare({ token }) {
  const [files, setFiles] = useState({ ownedFiles: [], sharedFiles: [] });
  const [uploadFile, setUploadFile] = useState(null);
  const [shareUsername, setShareUsername] = useState('');
  const [selectedFileId, setSelectedFileId] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const privateKey = localStorage.getItem('privateKey');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_ENDPOINTS.FILE.LIST);
      setFiles(res.data.data);
    } catch (err) {
      setError('Failed to fetch files: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !privateKey) {
      setError('Please select a file and ensure you are logged in');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('privateKey', privateKey);

      const res = await axios.post(API_ENDPOINTS.FILE.UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(`File "${res.data.data.filename}" uploaded successfully!`);
      setUploadFile(null);
      document.getElementById('fileInput').value = '';
      fetchFiles();
    } catch (err) {
      setError('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleFileDownload = async (fileId, filename) => {
    if (!privateKey) {
      setError('Private key not found. Please log in again.');
      return;
    }

    setDownloading(fileId);
    setError('');

    try {
      const res = await axios.post(
        API_ENDPOINTS.FILE.DOWNLOAD(fileId),
        { privateKey },
        { 
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`File "${filename}" downloaded successfully!`);
    } catch (err) {
      if (err.response?.data) {
        // Handle JSON error response
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result);
            setError('Download failed: ' + errorData.error);
          } catch {
            setError('Download failed: Unknown error');
          }
        };
        reader.readAsText(err.response.data);
      } else {
        setError('Download failed: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setDownloading('');
    }
  };

  const handleShareFile = async (e) => {
    e.preventDefault();
    if (!selectedFileId || !shareUsername || !privateKey) {
      setError('Please select a file, enter a username, and ensure you are logged in');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(
        API_ENDPOINTS.FILE.SHARE(selectedFileId),
        {
          usernames: [shareUsername],
          privateKey
        }
      );

      setSuccess(`File shared with ${shareUsername} successfully!`);
      setShareUsername('');
      setSelectedFileId('');
      fetchFiles();
    } catch (err) {
      setError('Share failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.delete(API_ENDPOINTS.FILE.DELETE(fileId));
      setSuccess(`File "${filename}" deleted successfully!`);
      fetchFiles();
    } catch (err) {
      setError('Delete failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 text-shadow">Secure File Sharing</h1>
        <p className="text-white/80 text-lg">Upload, share, and manage your encrypted files securely</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* File Upload Card */}
        <div className="glass-card">
          <div className="flex items-center mb-6">
            <svg className="h-6 w-6 text-blue-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h2 className="text-xl font-semibold text-white">Upload File</h2>
          </div>

          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label htmlFor="fileInput" className="block text-sm font-medium text-white/90 mb-2">
                Select File
              </label>
              <input
                id="fileInput"
                type="file"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="input-field focus-ring file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              <p className="mt-2 text-xs text-white/60">
                Maximum file size: 10MB. File will be encrypted automatically.
              </p>
            </div>

            <button
              type="submit"
              disabled={uploading || !uploadFile}
              className="btn-primary w-full py-3"
            >
              {uploading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Encrypting & Uploading...
                </div>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload File
                </>
              )}
            </button>
          </form>
        </div>

        {/* Share File Card */}
        <div className="glass-card">
          <div className="flex items-center mb-6">
            <svg className="h-6 w-6 text-green-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <h2 className="text-xl font-semibold text-white">Share File</h2>
          </div>

          <form onSubmit={handleShareFile} className="space-y-4">
            <div>
              <label htmlFor="fileSelect" className="block text-sm font-medium text-white/90 mb-2">
                Select File to Share
              </label>
              <select
                id="fileSelect"
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                className="input-field focus-ring"
                required
              >
                <option value="">Choose a file...</option>
                {files.ownedFiles.map((file) => (
                  <option key={file.fileId} value={file.fileId}>
                    {file.filename} ({formatFileSize(file.size)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="shareUsername" className="block text-sm font-medium text-white/90 mb-2">
                Share with Username
              </label>
              <input
                id="shareUsername"
                type="text"
                placeholder="Enter username to share with"
                value={shareUsername}
                onChange={(e) => setShareUsername(e.target.value)}
                className="input-field focus-ring"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !selectedFileId || !shareUsername}
              className="btn-secondary w-full py-3"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sharing...
                </div>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share File
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Files Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Owned Files */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-purple-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-xl font-semibold text-white">My Files</h2>
            </div>
            <span className="text-sm text-white/60 bg-white/10 px-3 py-1 rounded-full">
              {files.ownedFiles.length} files
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {files.ownedFiles.length === 0 ? (
              <div className="text-center py-8">
                <svg className="h-12 w-12 text-white/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <p className="text-white/60">No files uploaded yet</p>
              </div>
            ) : (
              files.ownedFiles.map((file) => (
                <div key={file.fileId} className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-4 hover:bg-white/10 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{file.filename}</h3>
                      <div className="flex items-center space-x-4 text-sm text-white/60 mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{formatDate(file.createdAt)}</span>
                        {file.sharedWithCount > 0 && (
                          <span className="text-green-400">
                            Shared with {file.sharedWithCount} user{file.sharedWithCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleFileDownload(file.fileId, file.filename)}
                        disabled={downloading === file.fileId}
                        className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
                        title="Download"
                      >
                        {downloading === file.fileId ? (
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.fileId, file.filename)}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Shared Files */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-green-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <h2 className="text-xl font-semibold text-white">Shared with Me</h2>
            </div>
            <span className="text-sm text-white/60 bg-white/10 px-3 py-1 rounded-full">
              {files.sharedFiles.length} files
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {files.sharedFiles.length === 0 ? (
              <div className="text-center py-8">
                <svg className="h-12 w-12 text-white/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <p className="text-white/60">No files shared with you yet</p>
              </div>
            ) : (
              files.sharedFiles.map((file) => (
                <div key={file.fileId} className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-4 hover:bg-white/10 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{file.filename}</h3>
                      <div className="flex items-center space-x-4 text-sm text-white/60 mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        <span>by {file.owner}</span>
                        <span>{formatDate(file.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleFileDownload(file.fileId, file.filename)}
                        disabled={downloading === file.fileId}
                        className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
                        title="Download"
                      >
                        {downloading === file.fileId ? (
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FileShare;
