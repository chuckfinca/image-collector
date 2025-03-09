import { useState } from 'react';
import { useDb } from '../context/DatabaseContext';

/**
 * Custom hook for version management functionality
 * Provides shared logic for creating, updating, and deleting versions
 */
export const useVersionManagement = (imageId) => {
  const { 
    versions, 
    activeVersions, 
    setActiveVersions, 
    fetchVersions, 
    createVersion,
    deleteVersion,
    operationStatus 
  } = useDb();
  
  // Version creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newVersionTag, setNewVersionTag] = useState('');
  const [notes, setNotes] = useState('');
  const [createBlank, setCreateBlank] = useState(false);
  
  // Get versions for this image
  const imageVersions = versions[imageId] || [];
  const activeVersionId = activeVersions[imageId];
  
  // Handle version selection
  const handleVersionChange = (versionId) => {
    // Update active version in context
    setActiveVersions(prev => ({
      ...prev,
      [imageId]: versionId
    }));
    
    return versionId;
  };
  
  // Create a new version
  const handleCreateVersion = async (options = {}) => {
    try {
      // Get values either from options or state
      const tag = options.tag || newVersionTag;
      const versionNotes = options.notes || notes;
      const isBlank = options.createBlank !== undefined ? options.createBlank : createBlank;
      
      if (!tag || !tag.trim()) {
        throw new Error("Version name is required");
      }
      
      // Use active version as source if copying data and one exists
      // For comparison view, optionally pass a specific sourceVersionId
      const sourceVersionId = !isBlank ? (options.sourceVersionId || activeVersionId) : null;
      
      const result = await createVersion(
        imageId, 
        tag, 
        sourceVersionId, 
        versionNotes,
        isBlank
      );
      
      // Reset form if using internal state
      if (!options.keepFormState) {
        setNewVersionTag('');
        setNotes('');
        setCreateBlank(false);
        setShowCreateForm(false);
      }
      
      // Refresh versions
      await fetchVersions(imageId);
      
      // Auto-select the newly created version
      if (result && result.version_id) {
        setActiveVersions(prev => ({
          ...prev,
          [imageId]: result.version_id
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Failed to create version:', error);
      throw error;
    }
  };
  
  // Delete a version
  const handleDeleteVersion = async (versionId) => {
    const versionToDelete = versionId || activeVersionId;
    
    if (!versionToDelete) {
      throw new Error("No version selected for deletion");
    }
    
    // Prevent deleting the only version
    if (imageVersions.length <= 1) {
      throw new Error("Cannot delete the only version");
    }
    
    try {
      await deleteVersion(versionToDelete);
      await fetchVersions(imageId);
      return true;
    } catch (error) {
      console.error("Failed to delete version:", error);
      throw error;
    }
  };
  
  return {
    // State and data
    showCreateForm,
    setShowCreateForm,
    newVersionTag,
    setNewVersionTag,
    notes,
    setNotes,
    createBlank,
    setCreateBlank,
    imageVersions,
    activeVersionId,
    operationStatus,
    
    // Actions
    handleVersionChange,
    handleCreateVersion,
    handleDeleteVersion
  };
};

export default useVersionManagement;