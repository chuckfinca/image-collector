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

  const fetchStatus = useCallback(async () => {
    if (!isConnected) return;
    
    try {
      const response = await fetch('http://localhost:8000/status');
      if (response.ok) {
        const data = await response.json();
        setTotalImages(data.total_images);
      } else {
        console.error('Failed to fetch status:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  }, [isConnected]);

  const fetchImages = useCallback(async () => {
    if (!isConnected) return;
    
    try {
      const response = await fetch('http://localhost:8000/images');
      if (response.ok) {
        const data = await response.json();
        setImages(data.images);
      } else {
        console.error('Failed to fetch images:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  }, [isConnected]);

  useEffect(() => {
    if (dbPath && !isConnected) {
      initializeDatabase();
    }
  }, [dbPath]);

  useEffect(() => {
    if (isConnected) {
      // Initial fetch
      fetchStatus();
      fetchImages();
      
      // Set up polling
      const interval = setInterval(() => {
        fetchStatus();
        fetchImages();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchStatus, fetchImages]);

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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to initialize database');
      }
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('imageDatabasePath', cleanPath);
        setIsConnected(true);
        setMessage('Connected to database successfully');
      } else {
        setMessage('Failed to connect to database');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setMessage(`Connection error: ${error.message}`);
      setIsConnected(false);
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

      if (!response.ok) {
        throw new Error('Failed to upload image from URL');
      }

      const result = await response.json();
      if (result.success) {
        setMessage('Image saved successfully');
        setUrl('');
        await Promise.all([fetchStatus(), fetchImages()]);
      } else {
        setMessage(result.error || 'Failed to save image');
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
        
        if (!response.ok) {
          failCount++;
          continue;
        }
        
        const result = await response.json();
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }
      
      setMessage(`Upload complete: ${successCount} succeeded, ${failCount} failed`);
      await Promise.all([fetchStatus(), fetchImages()]);
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [isConnected, fetchStatus, fetchImages]);

  return (
    <div className="w-full px-4">
      <div className="max-w-7xl mx-auto flex gap-8">
        {/* Configuration section with fixed width */}
        <div className="w-80 flex-none space-y-6">
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

        {/* Database viewer section that takes remaining space */}
        <div className="flex-1">
          <DatabaseViewer images={images} />
        </div>
      </div>
    </div>
  );
}

export default ImageCollector;