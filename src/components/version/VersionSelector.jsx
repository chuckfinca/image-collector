import React, { useState, useEffect } from 'react';
import { useDb } from '../../context/DatabaseContext';

const VersionSelector = ({ imageId, onVersionChange }) => {
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
  const [newVersionTag, setNewVersionTag] = useState('');
  const [notes, setNotes] = useState('');
  
  // Get versions for this image
  const imageVersions = versions[imageId] || [];
  const activeVersionId = activeVersions[imageId];
  
  // Fetch versions if needed
  useEffect(() => {
    if (!versions[imageId]) {
      fetchVersions(imageId);
    }
  }, [imageId, versions, fetchVersions]);
  
  // Handle version selection
  const handleVersionChange = (e) => {
    const versionId = parseInt(e.target.value, 10);
    
    // Update active version in context
    setActiveVersions(prev => ({
      ...prev,
      [imageId]: versionId
    }));
    
    // Notify parent component if needed
    if (onVersionChange) {
      onVersionChange(versionId);
    }
  };
  
  // Create a new version
  const handleCreateVersion = async (e) => {
    e.preventDefault();
    
    try {
      // Use active version as source if one exists
      const sourceVersionId = activeVersionId || null;
      
      const result = await createVersion(
        imageId, 
        newVersionTag, 
        sourceVersionId, 
        notes,
        false  // Not creating blank
      );
      
      // Reset form
      setNewVersionTag('');
      setNotes('');
      setShowCreateForm(false);
      
      // Auto-select the newly created version
      if (result && result.version_id) {
        setActiveVersions(prev => ({
          ...prev,
          [imageId]: result.version_id
        }));
        
        if (onVersionChange) {
          onVersionChange(result.version_id);
        }
      }
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  };
  
  // Delete the active version
  const handleDeleteVersion = async () => {
    if (!activeVersionId) return;
    
    // Prevent deleting the only version
    if (imageVersions.length <= 1) {
      alert("Cannot delete the only version");
      return;
    }
    
    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this version?")) {
      return;
    }
    
    try {
      await deleteVersion(activeVersionId);
    } catch (error) {
      console.error("Failed to delete version:", error);
    }
  };
  
  // If no versions available yet, show loading
  if (imageVersions.length === 0) {
    return <div className="text-text-muted text-sm">Loading versions...</div>;
  }
  
  return (
    <div className="space-y-3 p-2 border border-border rounded bg-background-alt/50">
      <h3 className="text-sm font-medium">Version</h3>
      
      {/* Version selector */}
      <select
        value={activeVersionId || ''}
        onChange={handleVersionChange}
        className="w-full px-2 py-1 bg-background-alt border border-border rounded text-sm"
      >
        {imageVersions.map(version => (
          <option key={version.id} value={version.id}>
            {version.tag} ({new Date(version.created_at).toLocaleDateString()})
          </option>
        ))}
      </select>
      
      {/* Version actions */}
      <div className="flex space-x-2">
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex-1 px-2 py-1 bg-secondary hover:bg-secondary/90 text-white rounded text-sm"
        >
          {showCreateForm ? 'Cancel' : 'New Version'}
        </button>
        
        {imageVersions.length > 1 && (
          <button 
            onClick={handleDeleteVersion}
            className="px-2 py-1 bg-error hover:bg-error/90 text-white rounded text-sm"
          >
            Delete
          </button>
        )}
      </div>
      
      {/* Create version form */}
      {showCreateForm && (
        <form onSubmit={handleCreateVersion} className="space-y-2 mt-2 border-t border-border pt-2">
          <div>
            <label className="block text-xs text-text-muted">Version Name</label>
            <input
              type="text"
              value={newVersionTag}
              onChange={(e) => setNewVersionTag(e.target.value)}
              placeholder="e.g., extracted, edited"
              className="w-full px-2 py-1 bg-background-alt border border-border rounded text-sm"
              required
            />
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
    </div>
  );
};

export default VersionSelector;