import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../services/api';

const DatabaseContext = createContext(null);

export const DatabaseProvider = ({ children }) => {
  const [images, setImages] = useState([]);
  const [dbPath, setDbPath] = useState(localStorage.getItem('imageDatabasePath') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalImages, setTotalImages] = useState(0);
  const [operationStatus, setOperationStatus] = useState({});

  // Centralized error handler
  const handleError = (error, operation) => {
    console.error(`Error during ${operation}:`, error);
    setError(error.message);
    setOperationStatus(prev => ({
      ...prev,
      [operation]: { error: error.message }
    }));
  };

  // Centralized image refresh
  const refreshImages = useCallback(async () => {
    if (!isConnected) return;
    try {
      const response = await api.fetchImages();
      setImages(response.images || []);
      const statusResponse = await api.getStatus();
      setTotalImages(statusResponse.total_images);
    } catch (error) {
      handleError(error, 'refresh');
    }
  }, [isConnected]);

  // Database connection management
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
      localStorage.setItem('imageDatabasePath', cleanPath);
      setIsConnected(true);
      await refreshImages();
    } catch (error) {
      handleError(error, 'connect');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [dbPath, refreshImages]);

  const disconnect = useCallback(() => {
    localStorage.removeItem('imageDatabasePath');
    setIsConnected(false);
    setTotalImages(0);
    setError(null);
    setDbPath('');
    setImages([]);
  }, []);

  // Image operations
  const extractContactInfo = useCallback(async (imageId) => {
    try {
      setOperationStatus(prev => ({
        ...prev,
        [`extract-${imageId}`]: { loading: true }
      }));

      const result = await api.extractContactInfo(imageId);
      
      // Wait a short moment to ensure backend processing is complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await refreshImages();

      setOperationStatus(prev => ({
        ...prev,
        [`extract-${imageId}`]: { success: true }
      }));

      return result;
    } catch (error) {
      handleError(error, `extract-${imageId}`);
      throw error;
    } finally {
      // Clear status after a delay
      setTimeout(() => {
        setOperationStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[`extract-${imageId}`];
          return newStatus;
        });
      }, 3000);
    }
  }, [refreshImages]);

  const updateImage = useCallback(async (imageId, updatedData) => {
    try {
      await api.updateImage(imageId, updatedData);
      await refreshImages();
    } catch (error) {
      handleError(error, `update-${imageId}`);
      throw error;
    }
  }, [refreshImages]);

  const deleteImage = useCallback(async (imageId) => {
    try {
      await api.deleteImage(imageId);
      await refreshImages();
    } catch (error) {
      handleError(error, `delete-${imageId}`);
      throw error;
    }
  }, [refreshImages]);

  const value = {
    // State
    dbPath,
    setDbPath,
    isConnected,
    loading,
    error,
    totalImages,
    images,
    operationStatus,
    
    // Database operations
    connect,
    disconnect,
    
    // Image operations
    extractContactInfo,
    updateImage,
    deleteImage,
    refreshImages
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDb = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDb must be used within a DatabaseProvider');
  }
  return context;
};