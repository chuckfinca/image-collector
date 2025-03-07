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
  const [versions, setVersions] = useState({});
  const [activeVersions, setActiveVersions] = useState({});

  // Centralized error handler
  const handleError = useCallback((error, operation) => {
    console.error(`Error during ${operation}:`, error);
    setError(error.message);
    setOperationStatus(prev => ({
      ...prev,
      [operation]: { error: error.message }
    }));
  }, []);

  // Centralized image refresh
  const refreshImages = useCallback(async () => {
    console.log(`Refreshing images. Connected: ${isConnected}, Path: ${dbPath}`);
    
    if (!isConnected) {
      console.log("Not connected, skipping refresh");
      return;
    }
    
    try {
      console.log("Fetching images from API...");
      const response = await api.fetchImages();
      console.log("API response:", response);
      
      if (!response) {
        console.error("No response from API");
      } else if (!response.images) {
        console.error("Response missing 'images' property:", response);
      } else if (!Array.isArray(response.images)) {
        console.error("Images is not an array:", response.images);
      } else {
        console.log(`Received ${response.images.length} images from API`);
        
        // Print some details about each image
        response.images.forEach((img, index) => {
          console.log(`Image ${index}: ID=${img.id}, Has thumbnail: ${img.thumbnail ? 'Yes' : 'No'}`);
        });
      }
      
      setImages(response?.images || []);
      
      // Check status separately
      console.log("Fetching database status...");
      const statusResponse = await api.getStatus();
      console.log("Status response:", statusResponse);
      setTotalImages(statusResponse.total_images);
      
      // Log any mismatch
      console.log(`Mismatch: total_images=${statusResponse.total_images}, images.length=${response?.images?.length || 0}`);
    } catch (error) {
      console.error("Error refreshing images:", error);
      handleError(error, 'refresh');
    }
  }, [isConnected, dbPath]);

  // Database connection management
  const connect = useCallback(async () => {
    if (!dbPath) {
      console.error("No database path provided");
      setError('Please enter a database path');
      return;
    }
  
    try {
      console.log(`Attempting to connect to database at: ${dbPath}`);
      setLoading(true);
      setError(null);
      const cleanPath = dbPath.replace(/\\\s/g, ' ');
      console.log(`Using cleaned path: ${cleanPath}`);
      
      const response = await api.initializeDatabase(cleanPath);
      console.log("Database initialization response:", response);
      
      localStorage.setItem('imageDatabasePath', cleanPath);
      console.log("Saved path to localStorage");
      
      // Set connection status
      setIsConnected(true);
      console.log("Set connection status to connected");
      
      // Instead of calling refreshImages which depends on state,
      // perform the refresh logic directly here
      console.log("Refreshing images directly after connection...");
      try {
        const imagesResponse = await api.fetchImages();
        console.log("Direct API response:", imagesResponse);
        setImages(imagesResponse.images || []);
        
        const statusResponse = await api.getStatus();
        console.log("Direct status response:", statusResponse);
        setTotalImages(statusResponse.total_images);
      } catch (error) {
        console.error("Error during direct refresh:", error);
        handleError(error, 'refresh');
        // Do NOT attempt reconnection here since we just connected
      }
    } catch (error) {
      console.error(`Connection error: ${error.message}`);
      handleError(error, 'connect');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [dbPath, handleError]);

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

  const fetchVersions = useCallback(async (imageId) => {
    try {
      const response = await api.getVersions(imageId);
      const activeVersion = response.versions.find(v => v.is_active);
      
      // Batch state updates
      setVersions(prev => {
        const newVersions = {...prev, [imageId]: response.versions};
        
        // Update active versions in the same render cycle
        if (activeVersion) {
          setActiveVersions(prevActive => ({
            ...prevActive,
            [imageId]: activeVersion.id
          }));
        }
        
        return newVersions;
      });
    } catch (error) {
      handleError(error, `fetch-versions-${imageId}`);
    }
  }, [handleError]);

  // Versioning operations
  const createVersion = useCallback(async (imageId, tag, sourceVersionId = null, notes = '', createBlank = false) => {
    try {
      setOperationStatus(prev => ({
        ...prev,
        [`version-${imageId}`]: { loading: true }
      }));
      
      // Ensure imageId is an integer
      const numericImageId = parseInt(imageId, 10);
      
      // Ensure sourceVersionId is either null or an integer
      let numericSourceVersionId = null;
      if (sourceVersionId !== null && sourceVersionId !== undefined && sourceVersionId !== '') {
        numericSourceVersionId = parseInt(sourceVersionId, 10);
        
        // Validate that parsed ID is a valid number
        if (isNaN(numericSourceVersionId)) {
          console.error(`Invalid sourceVersionId: ${sourceVersionId}`);
          numericSourceVersionId = null;
        }
      }
      
      console.log(`Creating version for image ${numericImageId} with source ${numericSourceVersionId}, createBlank=${createBlank}`);
      
      const result = await api.createVersion(numericImageId, {
        tag,
        source_version_id: numericSourceVersionId,
        notes,
        create_blank: createBlank  // Pass the createBlank flag
      });
      
      // Refresh versions
      await fetchVersions(numericImageId);
      
      setOperationStatus(prev => ({
        ...prev,
        [`version-${numericImageId}`]: { success: true }
      }));
      
      return result;
    } catch (error) {
      console.error(`Error creating version for image ${imageId}:`, error);
      handleError(error, `version-${imageId}`);
      throw error;
    } finally {
      // Clear status after a delay
      setTimeout(() => {
        setOperationStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[`version-${imageId}`];
          return newStatus;
        });
      }, 3000);
    }
  }, [fetchVersions, handleError, api]);
  
  // Add this improved updateVersionData function to your DatabaseContext.jsx

  const updateVersionData = useCallback(async (versionId, updatedData) => {
    try {
      console.log(`Updating version ${versionId} with data:`, updatedData);
      
      // Store the current active versions to preserve them
      const currentActiveVersions = {...activeVersions};
      
      await api.updateVersion(versionId, updatedData);
      
      // Find the image ID associated with this version
      let imageId = null;
      for (const [imgId, versionList] of Object.entries(versions)) {
        if (versionList.some(v => v.id === versionId)) {
          imageId = parseInt(imgId);
          break;
        }
      }
      
      if (imageId) {
        console.log(`Refreshing versions for image ${imageId} after update`);
        
        // First, refresh the versions data
        const versionsResponse = await api.getVersions(imageId);
        
        if (versionsResponse && versionsResponse.versions) {
          console.log(`Received updated versions:`, versionsResponse.versions);
          
          // Update versions while preserving active selection
          setVersions(prev => ({
            ...prev,
            [imageId]: versionsResponse.versions
          }));
          
          // Ensure the active version stays selected
          setActiveVersions(prev => ({
            ...prev,
            [imageId]: versionId
          }));
        }
        
        // Also refresh the main images to get latest data
        await refreshImages();
      }
      
      return true;
    } catch (error) {
      handleError(error, `update-version-${versionId}`);
      throw error;
    }
  }, [versions, activeVersions, handleError, refreshImages]);
  

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
    refreshImages,

    // Versioning
    versions,
    activeVersions,
    fetchVersions,
    createVersion,
    updateVersionData,
    setActiveVersions
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