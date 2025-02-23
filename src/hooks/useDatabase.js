// In useDatabase.js
import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';

export const useDatabase = () => {
  const [dbPath, setDbPath] = useState(localStorage.getItem('imageDatabasePath') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalImages, setTotalImages] = useState(0);

  // Add function to fetch images
  const fetchImages = async () => {
    try {
      const response = await api.fetchImages();
      return response.images;
    } catch (err) {
      console.error('Error fetching images:', err);
      return [];
    }
  };

  const connect = useCallback(async () => {
    if (!dbPath) {
      setError('Please enter a database path');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const cleanPath = dbPath.replace(/\\\s/g, ' ');
      await api.initializeDatabase(cleanPath);
      
      // Fetch initial images after connecting
      const images = await fetchImages();
      if (images) {
        console.log('Initial images loaded:', images);
      }
      
      localStorage.setItem('imageDatabasePath', cleanPath);
      setIsConnected(true);
    } catch (err) {
      setError(err.message);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [dbPath]);

  // Add initialization effect
  useEffect(() => {
    const initializeFromStorage = async () => {
      const storedPath = localStorage.getItem('imageDatabasePath');
      if (storedPath) {
        setDbPath(storedPath);
        await connect();
      }
    };

    initializeFromStorage();
  }, []); // Run once on mount

  const disconnect = useCallback(() => {
    localStorage.removeItem('imageDatabasePath');
    setIsConnected(false);
    setTotalImages(0);
    setError(null);
    setDbPath('');
  }, []);

  const updateStatus = useCallback(async () => {
    if (!isConnected) return;
    
    try {
      const data = await api.getStatus();
      setTotalImages(data.total_images);
    } catch (err) {
      setError(err.message);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      updateStatus();
      const interval = setInterval(updateStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, updateStatus]);

  return {
    dbPath,
    setDbPath,
    isConnected,
    loading,
    error,
    totalImages,
    connect,
    disconnect,
    fetchImages // Export the fetchImages function
  };
};