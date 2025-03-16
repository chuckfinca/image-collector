import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';

const DatabaseContext = createContext(null);

export const DatabaseProvider = ({ children }) => {
  // Core state
  const [images, setImages] = useState([]);
  const [versions, setVersions] = useState({});  // Indexed by imageId
  const [activeVersions, setActiveVersions] = useState({}); // Keeps track of active version per image
  
  // Connection state
  const [dbPath, setDbPath] = useState(localStorage.getItem('imageDatabasePath') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Status tracking
  const [operationStatus, setOperationStatus] = useState({});
  
  // Simple error handler
  const handleError = useCallback((error, operation) => {
    console.error(`Error during ${operation}:`, error);
    setError(error.message);
    setOperationStatus(prev => ({
      ...prev,
      [operation]: { error: error.message }
    }));
    
    // Clear error status after a delay
    setTimeout(() => {
      setOperationStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[operation];
        return newStatus;
      });
    }, 3000);
  }, []);

  // Centralized image refresh
  const refreshImages = useCallback(async () => {
    if (!isConnected) return;
    
    try {
      console.log("Attempting to fetch images from database...");
      const response = await api.fetchImages();
      console.log("Fetch images response:", response);
      
      // Check if response is null or undefined first
      if (!response) {
        console.warn("Received null response from API");
        setImages([]);
        return;
      }
      
      if (response?.images) {
        console.log(`Received ${response.images.length} images from database`);
        setImages(response.images);
      } else {
        console.warn("No images returned from database or invalid response format");
        setImages([]);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
      handleError(error, 'refresh');
    }
  }, [isConnected, handleError]);
  
  // Also check your DatabaseViewer.jsx and add this logging
  useEffect(() => {
    console.log("DatabaseViewer - Current images state:", images);
    console.log("DatabaseViewer - Current versions state:", versions);
  }, [images, versions]);
  

  // Database connection
  const connect = useCallback(async () => {
    if (!dbPath) {
      setError('Please enter a database path');
      return;
    }
  
    try {
      setLoading(true);
      setError(null);
      
      await api.initializeDatabase(dbPath);
      localStorage.setItem('imageDatabasePath', dbPath);
      setIsConnected(true);
      
      // Fetch initial data - add null check here
      try {
        const imagesResponse = await api.fetchImages();
        // Safely handle potential null response
        if (imagesResponse && imagesResponse.images) {
          setImages(imagesResponse.images || []);
        } else {
          console.warn("Empty or invalid response when fetching images");
          setImages([]);
        }
      } catch (fetchError) {
        console.error("Error fetching initial images:", fetchError);
        setImages([]);
        // Don't fail the whole connection for this
      }
    } catch (error) {
      handleError(error, 'connect');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [dbPath, handleError]);  

  const disconnect = useCallback(() => {
    localStorage.removeItem('imageDatabasePath');
    setIsConnected(false);
    setImages([]);
    setVersions({});
    setActiveVersions({});
    setError(null);
    setDbPath('');
  }, []);

  // Version operations
  const fetchVersions = useCallback(async (imageId) => {
    if (!isConnected) return;
    
    try {
      const response = await api.getVersions(imageId);
      
      // Find active version or default to first
      let activeVersionId = null;
      const imageVersions = response.versions || [];
      
      // First try to find the active version
      const activeVersion = imageVersions.find(v => v.is_active);
      if (activeVersion) {
        activeVersionId = activeVersion.id;
      } 
      // If no active version but we have versions, use the first one
      else if (imageVersions.length > 0) {
        activeVersionId = imageVersions[0].id;
      }
      
      // Update versions and active version
      setVersions(prev => ({
        ...prev,
        [imageId]: imageVersions
      }));
      
      if (activeVersionId) {
        setActiveVersions(prev => ({
          ...prev,
          [imageId]: activeVersionId
        }));
      }
      
      return imageVersions;
    } catch (error) {
      handleError(error, `fetch-versions-${imageId}`);
      return [];
    }
  }, [isConnected, handleError]);

  const createVersion = useCallback(async (imageId, tag, sourceVersionId = null, notes = '', createBlank = false) => {
    try {
      setOperationStatus(prev => ({
        ...prev,
        [`version-${imageId}`]: { loading: true }
      }));
      
      const result = await api.createVersion(imageId, {
        tag,
        source_version_id: sourceVersionId,
        notes,
        create_blank: createBlank
      });
      
      // Refresh versions
      await fetchVersions(imageId);
      
      setOperationStatus(prev => ({
        ...prev,
        [`version-${imageId}`]: { success: true }
      }));
      
      return result;
    } catch (error) {
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
  }, [fetchVersions, handleError]);

  const updateVersion = useCallback(async (versionId, data) => {
    try {
      // Find the image ID for this version
      let imageId = null;
      for (const [imgId, versionList] of Object.entries(versions)) {
        if (versionList.some(v => v.id === versionId)) {
          imageId = parseInt(imgId);
          break;
        }
      }
      
      // Update the version
      await api.updateVersion(versionId, data);
      
      // Refresh the versions if we found the image ID
      if (imageId) {
        await fetchVersions(imageId);
      }
      
      return true;
    } catch (error) {
      handleError(error, `update-version-${versionId}`);
      throw error;
    }
  }, [versions, fetchVersions, handleError]);

  // Image operations
  const extractContactInfo = useCallback(async (imageId) => {
    try {
      setOperationStatus(prev => ({
        ...prev,
        [`extract-${imageId}`]: { loading: true }
      }));

      const result = await api.extractContactInfo(imageId);
      
      // Refresh data
      await refreshImages();
      await fetchVersions(imageId);

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
  }, [refreshImages, fetchVersions, handleError]);

  // Helper function to get version data for an image
  const getVersionData = useCallback((imageId) => {
    const imageVersions = versions[imageId] || [];
    const activeVersionId = activeVersions[imageId];
    
    if (!activeVersionId || imageVersions.length === 0) {
      return null;
    }
    
    return imageVersions.find(v => v.id === activeVersionId) || null;
  }, [versions, activeVersions]);

  const deleteImage = useCallback(async (imageId) => {
    try {
      setOperationStatus(prev => ({
        ...prev,
        [`delete-image-${imageId}`]: { loading: true }
      }));

      await api.deleteImage(imageId);
      
      // Update local state
      setImages(prev => prev.filter(img => img.id !== imageId));
      setVersions(prev => {
        const newVersions = {...prev};
        delete newVersions[imageId];
        return newVersions;
      });
      setActiveVersions(prev => {
        const newState = {...prev};
        delete newState[imageId];
        return newState;
      });
      
      setOperationStatus(prev => ({
        ...prev,
        [`delete-image-${imageId}`]: { success: true }
      }));
      
      return true;
    } catch (error) {
      handleError(error, `delete-image-${imageId}`);
      throw error;
    } finally {
      // Clear status after delay
      setTimeout(() => {
        setOperationStatus(prev => {
          const newState = {...prev};
          delete newState[`delete-image-${imageId}`];
          return newState;
        });
      }, 3000);
    }
  }, [setImages, setVersions, setActiveVersions, handleError]);

  const deleteVersion = useCallback(async (versionId) => {
    try {
      setOperationStatus(prev => ({
        ...prev,
        [`delete-version-${versionId}`]: { loading: true }
      }));
      
      // Find associated image
      let imageId = null;
      for (const [imgId, versionList] of Object.entries(versions)) {
        if (versionList.some(v => v.id === versionId)) {
          imageId = parseInt(imgId);
          break;
        }
      }
      
      if (!imageId) throw new Error(`Cannot find image for version ${versionId}`);
      
      await api.deleteVersion(versionId);
      await fetchVersions(imageId);
      
      setOperationStatus(prev => ({
        ...prev,
        [`delete-version-${versionId}`]: { success: true }
      }));
      
      return true;
    } catch (error) {
      handleError(error, `delete-version-${versionId}`);
      throw error;
    } finally {
      setTimeout(() => {
        setOperationStatus(prev => {
          const newState = {...prev};
          delete newState[`delete-version-${versionId}`];
          return newState;
        });
      }, 3000);
    }
  }, [versions, fetchVersions, handleError]);

  const value = {
    // Core state
    images,
    versions,
    activeVersions,
    setActiveVersions,
    
    // Connection state
    dbPath,
    setDbPath,
    isConnected,
    loading,
    error,
    operationStatus,
    
    // Database operations
    connect,
    disconnect,
    refreshImages,
    
    // Version operations
    fetchVersions,
    createVersion,
    updateVersion,
    deleteVersion,
    getVersionData,
    
    // Image operations
    extractContactInfo,
    deleteImage
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