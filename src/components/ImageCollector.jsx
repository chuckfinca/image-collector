import React, { useState, useEffect, useCallback } from 'react';
import DatabaseConnection from './DatabaseConnection';
import ImageUrlInput from './ImageUrlInput';
import DropZone from './DropZone';
import StatusMessage from './StatusMessage';
import DatabaseViewer from './DatabaseViewer';

function ImageCollector() {
  const [url, setUrl] = useState('');
  const [dbPath, setDbPath] = useState(localStorage.getItem('imageDatabasePath') || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [totalImages, setTotalImages] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (dbPath) {
      initializeDatabase();
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(fetchStatus, 5000);
      fetchImages();
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const fetchImages = async () => {
    try {
      const response = await fetch('http://localhost:8000/images');
      if (response.ok) {
        const data = await response.json();
        setImages(data.images);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const initializeDatabase = async () => {
    if (!dbPath) {
      setMessage('Please enter a database path');
      return;
    }

    const cleanPath = dbPath.replace(/\\\s/g, ' ');
    
    try {
      setLoading(true);
      setMessage('Attempting to connect...');
      
      const response = await fetch('http://localhost:8000/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_path: cleanPath })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('imageDatabasePath', cleanPath);
        setIsConnected(true);
        setMessage('Connected to database successfully');
        fetchStatus();
        fetchImages();
      } else {
        console.error('Server response:', data);
        setMessage(`Connection failed: ${data.detail || 'Server error'}`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      setMessage(`Connection error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('imageDatabasePath');
    setIsConnected(false);
    setTotalImages(0);
    setMessage('');
    setDbPath('');
    setImages([]);
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/status');
      if (response.ok) {
        const data = await response.json();
        setTotalImages(data.total_images);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url || !isConnected) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('url', url);

      const response = await fetch('http://localhost:8000/upload/url', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setMessage('Image saved successfully');
        setUrl('');
        fetchStatus();
        fetchImages();
      } else {
        setMessage('Failed to save image');
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target.classList.contains('dropzone')) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isConnected) return;
    
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    if (files.length === 0) {
      setMessage('Please drop image files only');
      return;
    }
    
    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:8000/upload/file', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }
      
      setMessage(`Upload complete: ${successCount} succeeded, ${failCount} failed`);
      fetchStatus();
      fetchImages();
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  return (
    <div className="grid grid-cols-2 gap-8 max-w-full mx-auto p-6">
      <div className="space-y-6">
        <DatabaseConnection 
          dbPath={dbPath}
          setDbPath={setDbPath}
          isConnected={isConnected}
          loading={loading}
          onConnect={initializeDatabase}
          onDisconnect={handleDisconnect}
          totalImages={totalImages}
        />

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

        <StatusMessage message={message} />
      </div>

      <div>
        <DatabaseViewer images={images} />
      </div>
    </div>
  );
}

export default ImageCollector;