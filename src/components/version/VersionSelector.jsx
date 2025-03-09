import React, { useEffect } from 'react';
import { useDb } from '../../context/DatabaseContext';
import useVersionManagement from '../../hooks/useVersionManagement';

const VersionSelector = ({ imageId, onVersionChange }) => {
  const { fetchVersions, versions } = useDb();
  
  const {
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
    handleVersionChange,
    handleCreateVersion,
    handleDeleteVersion
  } = useVersionManagement(imageId);
  
  // Fetch versions if needed
  useEffect(() => {
    if (!versions[imageId]) {
      fetchVersions(imageId);
    }
  }, [imageId, versions, fetchVersions]);
  
  // Handle version change with callback to parent
  const onSelectVersion = (e) => {
    const versionId = parseInt(e.target.value, 10);
    handleVersionChange(versionId);
    
    // Notify parent component if needed
    if (onVersionChange) {
      onVersionChange(versionId);
    }
  };
  
  // Handle the form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await handleCreateVersion();
    } catch (error) {
      alert(error.message);
    }
  };
  
  // Handle delete with confirmation
  const onDeleteClick = async () => {
    if (!window.confirm("Are you sure you want to delete this version?")) {
      return;
    }
    
    try {
      await handleDeleteVersion();
    } catch (error) {
      alert(error.message);
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
        onChange={onSelectVersion}
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
            onClick={onDeleteClick}
            className="px-2 py-1 bg-error hover:bg-error/90 text-white rounded text-sm"
          >
            Delete
          </button>
        )}
      </div>
      
      {/* Create version form */}
      {showCreateForm && (
        <form onSubmit={handleSubmit} className="space-y-2 mt-2 border-t border-border pt-2">
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
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`create-blank-${imageId}`}
              checked={createBlank}
              onChange={() => setCreateBlank(!createBlank)}
              className="mr-2"
            />
            <label htmlFor={`create-blank-${imageId}`} className="text-xs">
              Start with empty version (don't copy current data)
            </label>
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