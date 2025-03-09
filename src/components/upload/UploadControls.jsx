import React, { useState, useRef } from 'react';
import { useDb } from '../../context/DatabaseContext';
import { api } from '../../services/api';

function UploadControls({ onStatusChange }) {
  const [url, setUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const { refreshImages } = useDb();
  const dropRef = useRef(null);

  // This function replaces the processFiles function in UploadControls.jsx

const processFiles = async (files) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );
  
    if (imageFiles.length === 0) {
      onStatusChange('No valid image files');
      return;
    }
  
    let successCount = 0;
    let failCount = 0;
    let errorMsg = '';
  
    onStatusChange('Uploading...');
  
    for (const file of imageFiles) {
      try {
        console.log(`Uploading file: ${file.name}, size: ${file.size} bytes`);
        const response = await api.uploadImageFile(file);
        
        if (response && response.success) {
          successCount++;
        } else {
          failCount++;
          errorMsg = response?.message || 'Unknown error';
          console.error('Upload failed with response:', response);
        }
      } catch (error) {
        console.error('Upload caught error:', error.message);
        failCount++;
        errorMsg = error.message;
      }
    }
  
    try {
      await refreshImages();
    } catch (error) {
      console.error('Failed to refresh images:', error);
    }
    
    if (failCount === 0) {
      onStatusChange(`Uploaded ${successCount} image${successCount !== 1 ? 's' : ''}`);
      // Auto-clear success messages after a delay
      setTimeout(() => onStatusChange(''), 5000);
    } else {
      // For error messages, create a permanent message that doesn't auto-clear
      const statusMessage = `Upload failed (${failCount} files): ${errorMsg}`;
      console.error(statusMessage);  // Also log to console
      onStatusChange(statusMessage);
      // Don't auto-clear error messages
    }
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
      const response = await api.uploadImageUrl(url);
      setUrl('');
      onStatusChange('Image uploaded successfully');
      await refreshImages();
      
      // Auto-clear success message after a delay
      setTimeout(() => onStatusChange(''), 5000);
    } catch (error) {
      const errorMessage = `Upload failed: ${error.message}`;
      console.error(errorMessage);  // Log to console
      onStatusChange(errorMessage);
      // Don't auto-clear error messages
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
          className="w-36 sm:w-48 px-2 py-1 bg-background-alt border border-border rounded-l text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!url.trim()}
          className="px-3 py-1 bg-primary text-white rounded-r text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      
      {/* File Upload with Drop */}
      <div 
        className={`relative ${isDragging ? 'ring-2 ring-primary' : ''}`}
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
          multiple
        />
        <button
          className={`px-3 py-1 ${isDragging ? 'bg-primary' : 'bg-secondary'} text-white rounded text-sm hover:bg-secondary/90 flex items-center transition-colors`}
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