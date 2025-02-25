import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useDb } from '../context/DatabaseContext';

export const useImageUpload = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setImages } = useDb();

  const uploadFromUrl = async (url) => {
    if (!url) return;

    setLoading(true);
    setError(null);
    
    try {
      await api.uploadImageUrl(url);
      const response = await api.fetchImages();
      setImages(response.images);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (files) => {
    if (!files.length) return;

    setLoading(true);
    setError(null);
    
    try {
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );

      let successCount = 0;
      let failCount = 0;

      for (const file of imageFiles) {
        try {
          await api.uploadImageFile(file);
          successCount++;
        } catch (err) {
          failCount++;
        }
      }

      const response = await api.fetchImages();
      setImages(response.images);
      
      return { successCount, failCount };
    } catch (err) {
      setError(err.message);
      return { successCount: 0, failCount: files.length };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    uploadFromUrl,
    uploadFiles
  };
};