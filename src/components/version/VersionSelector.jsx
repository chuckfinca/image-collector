import React, { useState, useEffect } from 'react';
import { useDb } from '../../context/DatabaseContext';
import VersionPivotModal from './VersionPivotModal';

function VersionSelector({ imageId }) {
  const { 
    versions, 
    activeVersions, 
    setActiveVersions, 
    fetchVersions, 
    createVersion,
    deleteVersion,
    operationStatus
  } = useDb();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPivotModal, setShowPivotModal] = useState(false);
  const [newVersionTag, setNewVersionTag] = useState('');
  const [notes, setNotes] = useState('');
  const [creationMode, setCreationMode] = useState('copy'); // 'copy' or 'fresh'
  
  // Get versions for this image
  const imageVersions = versions[imageId] || [];
  const activeVersionId = activeVersions[imageId];
  
  // Check if delete operation is in progress
  const isDeleting = activeVersionId && operationStatus[`delete-version-${activeVersionId}`]?.loading;
  
  useEffect(() => {
    // Only fetch versions once when the component mounts or if versions are empty
    if (!versions[imageId]) {
      console.log(`Initial fetch of versions for image ${imageId}`);
      fetchVersions(imageId);
    }
  }, [imageId, versions, fetchVersions]);
  
  const handleVersionChange = (e) => {
    const versionId = parseInt(e.target.value, 10);
    console.log(`Setting active version for image ${imageId} to ${versionId}`);
    
    if (versionId) {
      // Set the selected version as active
      setActiveVersions(prev => ({
        ...prev,
        [imageId]: versionId
      }));
    } else {
      // If empty value selected, remove the active version (use base image)
      setActiveVersions(prev => {
        const newVersions = {...prev};
        delete newVersions[imageId];
        return newVersions;
      });
    }
  };
  
  const handleCreateVersion = async (e) => {
    e.preventDefault();
    
    try {
      // Determine parameters based on creation mode
      let sourceVersionId = null;
      let createBlank = false;
      
      if (creationMode === 'copy') {
        // Use the currently active version, or null if none is selected (will copy from base)
        sourceVersionId = activeVersionId || null;
        createBlank = false;
      } else {
        // For "fresh" mode, create a blank version
        sourceVersionId = null;
        createBlank = true;
      }
      
      console.log(`Creating version with mode: ${creationMode}, sourceVersionId: ${sourceVersionId}, createBlank: ${createBlank}`);
      
      const result = await createVersion(
        imageId, 
        newVersionTag, 
        sourceVersionId, 
        notes,
        createBlank  // Pass the createBlank flag
      );
      
      console.log(`Created new version with ID: ${result.version_id}`);
      
      // Reset form
      setNewVersionTag('');
      setNotes('');
      setShowCreateForm(false);
      
      // Make sure versions are refreshed
      await fetchVersions(imageId);
      
      // Auto-select the newly created version
      if (result && result.version_id) {
        setActiveVersions(prev => ({
          ...prev,
          [imageId]: result.version_id
        }));
      }
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  };

  // Handle opening the pivot table modal
  const handleOpenPivotTable = () => {
    if (imageVersions.length < 2) {
      alert("You need at least 2 versions to compare in a pivot table.");
      return;
    }
    setShowPivotModal(true);
  };
  
  // Handle delete version
  const handleDeleteVersion = async () => {
    if (!activeVersionId) return;
    
    // Get active version details for confirmation message
    const activeVersion = imageVersions.find(v => v.id === activeVersionId);
    if (!activeVersion) return;
    
    // Check if this is the only version
    if (imageVersions.length <= 1) {
      alert("Cannot delete the only version for this image.");
      return;
    }
    
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete version "${activeVersion.tag}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Delete the version
      await deleteVersion(activeVersionId);
    } catch (error) {
      console.error("Failed to delete version:", error);
    }
  };
  
  return (
    <>
      <div className="space-y-3 p-2 border border-border rounded bg-background-alt/50">
        <h3 className="text-sm font-medium">Version Control</h3>
        
        {/* Version selector */}
        <div className="flex space-x-2">
          <select
            value={activeVersionId || ''}
            onChange={handleVersionChange}
            className="flex-1 px-2 py-1 bg-background-alt border border-border rounded text-sm"
            disabled={isDeleting}
          >
            <option value="">Base Image</option>
            {imageVersions.map(version => (
              <option key={version.id} value={version.id}>
                {version.tag} ({new Date(version.created_at).toLocaleString()})
              </option>
            ))}
          </select>
          
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-2 py-1 bg-secondary hover:bg-secondary/90 text-white rounded text-sm"
            disabled={isDeleting}
          >
            {showCreateForm ? 'Cancel' : 'New Version'}
          </button>
        </div>
        
        {/* Create version form */}
        {showCreateForm && (
          <form onSubmit={handleCreateVersion} className="space-y-2">
            <div>
              <label className="block text-xs text-text-muted">Version Tag</label>
              <input
                type="text"
                value={newVersionTag}
                onChange={(e) => setNewVersionTag(e.target.value)}
                placeholder="e.g., extracted, verified"
                className="w-full px-2 py-1 bg-background-alt border border-border rounded text-sm"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs text-text-muted">Creation Method</label>
              
              <div className="flex flex-col space-y-1">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="creationMode"
                    value="copy"
                    checked={creationMode === 'copy'}
                    onChange={() => setCreationMode('copy')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    Copy {activeVersionId ? 'current version' : 'base image'}
                  </span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="creationMode"
                    value="fresh"
                    checked={creationMode === 'fresh'}
                    onChange={() => setCreationMode('fresh')}
                    className="mr-2"
                  />
                <span className="text-sm">Start fresh</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-text-muted">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2 py-1 bg-background-alt border border-border rounded text-sm"
                rows={2}
              />
            </div>
            
            <button 
              type="submit"
              className="w-full px-2 py-1 bg-primary hover:bg-primary/90 text-white rounded text-sm"
            >
              Create Version
            </button>
          </form>
        )}
        
        {/* Version info */}
        {activeVersionId && imageVersions.find(v => v.id === activeVersionId) && (
          <div className="text-xs text-text-muted">
            <p><strong>Created:</strong> {new Date(imageVersions.find(v => v.id === activeVersionId).created_at).toLocaleString()}</p>
            {imageVersions.find(v => v.id === activeVersionId).notes && (
              <p><strong>Notes:</strong> {imageVersions.find(v => v.id === activeVersionId).notes}</p>
            )}
          </div>
        )}
        
        {/* Version action buttons */}
        <div className="flex space-x-2">
          {/* Compare versions button */}
          {imageVersions.length >= 2 && (
            <button 
              onClick={handleOpenPivotTable}
              className="flex-1 px-2 py-1 text-sm bg-info hover:bg-info/90 text-white rounded transition-colors"
              disabled={isDeleting}
            >
              Compare All Versions
            </button>
          )}
          
          {/* Delete button (only show if a version is selected) */}
          {activeVersionId && imageVersions.length > 1 && (
            <button 
              onClick={handleDeleteVersion}
              disabled={isDeleting}
              className="px-3 py-1 text-sm bg-error hover:bg-error/90 text-white rounded transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-1"></span>
                  <span>Deleting...</span>
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </span>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Pivot Table Modal */}
      <VersionPivotModal 
        imageId={imageId} 
        isOpen={showPivotModal} 
        onClose={() => setShowPivotModal(false)} 
      />
    </>
  );
}

export default VersionSelector;