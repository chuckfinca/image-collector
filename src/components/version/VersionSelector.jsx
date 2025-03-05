// Create a new file: src/components/version/VersionSelector.jsx
import React, { useState, useEffect } from 'react';
import { useDb } from '../../context/DatabaseContext';

function VersionSelector({ imageId }) {
  const { 
    versions, 
    activeVersions, 
    setActiveVersions, 
    fetchVersions, 
    createVersion 
  } = useDb();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newVersionTag, setNewVersionTag] = useState('');
  const [sourceVersionId, setSourceVersionId] = useState(null);
  const [notes, setNotes] = useState('');
  
  // Get versions for this image
  const imageVersions = versions[imageId] || [];
  const activeVersionId = activeVersions[imageId];
  
  useEffect(() => {

    // Only fetch versions once when the component mounts
    if (!versions[imageId]) {
      fetchVersions(imageId);
    }
  }, [imageId, versions, fetchVersions]);
  
  const handleVersionChange = (e) => {
    const versionId = parseInt(e.target.value);
    setActiveVersions(prev => ({
      ...prev,
      [imageId]: versionId
    }));
  };
  
  const handleCreateVersion = async (e) => {
    e.preventDefault();
    try {
      await createVersion(imageId, newVersionTag, sourceVersionId, notes);
      // Reset form
      setNewVersionTag('');
      setNotes('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  };
  
  return (
    <div className="space-y-3 p-2 border border-border rounded bg-background-alt/50">
      <h3 className="text-sm font-medium">Version Control</h3>
      
      {/* Version selector */}
      <div className="flex space-x-2">
        <select
          value={activeVersionId || ''}
          onChange={handleVersionChange}
          className="flex-1 px-2 py-1 bg-background-alt border border-border rounded text-sm"
        >
          <option value="" disabled>Select version</option>
          {imageVersions.map(version => (
            <option key={version.id} value={version.id}>
              {version.tag} ({new Date(version.created_at).toLocaleString()})
            </option>
          ))}
        </select>
        
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-2 py-1 bg-secondary hover:bg-secondary/90 text-white rounded text-sm"
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
          
          <div>
            <label className="block text-xs text-text-muted">Base Version (optional)</label>
            <select
              value={sourceVersionId || ''}
              onChange={(e) => setSourceVersionId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-2 py-1 bg-background-alt border border-border rounded text-sm"
            >
              <option value="">Start from scratch</option>
              {imageVersions.map(version => (
                <option key={version.id} value={version.id}>
                  {version.tag} ({new Date(version.created_at).toLocaleString()})
                </option>
              ))}
            </select>
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
    </div>
  );
}

export default VersionSelector;