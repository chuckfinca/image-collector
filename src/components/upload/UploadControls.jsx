import React, { useState, useRef } from 'react';
import { useDb } from '../../context/DatabaseContext';
import { api } from '../../services/api';

function UploadControls({ onStatusChange }) {
  const [url, setUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const { loading, refreshImages } = useDb();
  const dropRef = useRef(null);

  const processFiles = async (files) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      onStatusChange('No valid image files');
      setTimeout(() => onStatusChange(''), 3000);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    onStatusChange('Uploading...');

    for (const file of imageFiles) {
      try {
        await api.uploadImageFile(file);
        successCount++;
      } catch (error) {
        console.error('Failed to upload file:', file.name, error);
        failCount++;
      }
    }

    await refreshImages();
    
    if (failCount === 0) {
      onStatusChange(`Uploaded ${successCount} image${successCount !== 1 ? 's' : ''}`);
    } else {
      onStatusChange(`Upload results: ${successCount} succeeded, ${failCount} failed`);
    }
    
    // Clear status after a delay
    setTimeout(() => onStatusChange(''), 3000);
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
      // Clear the file input
      e.target.value = null;
    }
  };
  
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if we're leaving the drop target
    // and not entering a child element
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
  
    try {
      onStatusChange('Uploading image...');
      await api.uploadImageUrl(url);
      setUrl('');
      onStatusChange('Image uploaded successfully');
      await refreshImages();
      // Clear status after a delay
      setTimeout(() => onStatusChange(''), 3000);
    } catch (error) {
      onStatusChange(`Upload failed: ${error.message}`);
      setTimeout(() => onStatusChange(''), 5000);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* URL Input */}
      <form onSubmit={handleUrlSubmit} className="flex items-center">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Image URL"
          className="w-36 sm:w-48 px-2 py-1 bg-gray-700 border border-gray-600 rounded-l text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-3 py-1 bg-blue-600 text-white rounded-r text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      
      {/* File Upload with Drop */}
      <div 
        className={`relative ${isDragging ? 'ring-2 ring-blue-400' : ''}`}
        ref={dropRef}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id="file-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={loading}
          multiple
        />
        <button
          className={`px-3 py-1 ${isDragging ? 'bg-blue-600' : 'bg-purple-600'} text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center transition-colors`}
          disabled={loading}
        >
          <svg 
            className="w-4 h-4 mr-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{isDragging ? 'Drop Here' : 'Browse/Drop'}</span>
        </button>
      </div>
    </div>
  );
}

export default UploadControls;