import React, { useState } from 'react';
import { useDb } from '../context/DatabaseContext';
import DatabaseConnection from './database/DatabaseConnection';
import DatabaseViewer from './database/DatabaseViewer';
import DropZone from './image/DropZone';
import ImageUrlInput from './image/ImageUrlInput';
import StatusMessage from './ui/StatusMessage';
import { api } from '../services/api';

function ImageCollector() {
  // Local UI state
  const [url, setUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState({ message: '', type: 'info' });
  
  // Get everything we need from context
  const { 
    isConnected, 
    loading,
    refreshImages
  } = useDb();

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
  
    try {
      setStatus({ message: 'Uploading image...', type: 'info' });
      await api.uploadImageUrl(url);
      setUrl('');
      setStatus({ message: 'Image uploaded successfully', type: 'success' });
      await refreshImages();
    } catch (error) {
      setStatus({ 
        message: `Upload failed: ${error.message}`, 
        type: 'error' 
      });
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    if (files.length === 0) {
      setStatus({ message: 'No valid image files found', type: 'error' });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    setStatus({ message: 'Uploading images...', type: 'info' });

    for (const file of files) {
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
      setStatus({ 
        message: `Successfully uploaded ${successCount} image${successCount !== 1 ? 's' : ''}`, 
        type: 'success' 
      });
    } else {
      setStatus({ 
        message: `Upload complete: ${successCount} succeeded, ${failCount} failed`, 
        type: 'warning' 
      });
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
    if (e.target.classList.contains('dropzone')) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="w-full px-4">
      <div className="max-w-7xl mx-auto flex gap-8">
        <div className="w-80 flex-none space-y-6">
          <DatabaseConnection />

          {isConnected && (
            <>
              <ImageUrlInput 
                url={url}
                setUrl={setUrl}
                loading={loading}
                onSubmit={handleUrlSubmit}
              />

              <DropZone 
                isDragging={isDragging}
                loading={loading}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            </>
          )}

          <StatusMessage 
            message={status.message}
            type={status.type}
          />
        </div>

        <div className="flex-1">
          <DatabaseViewer />
        </div>
      </div>
    </div>
  );
}

export default ImageCollector;