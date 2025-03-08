import React, { useState, useEffect } from 'react';
import { useDb } from '../../context/DatabaseContext';
import VersionSelector from '../version/VersionSelector';
import { VersionFields } from '../fields/SimpleFields';
import ImageViewModal from '../image/ImageViewModal';
import VersionPivotTable from '../version/VersionPivotTable';

function DatabaseViewer() {
  const { 
    images,
    versions,
    activeVersions,
    getVersionData,
    fetchVersions,
    updateVersion,
    deleteImage,
    extractContactInfo,
    operationStatus
  } = useDb();

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [showPivotTable, setShowPivotTable] = useState(false);
  const [selectedImageForPivot, setSelectedImageForPivot] = useState(null);

  // Initialize edit data when entering edit mode
  useEffect(() => {
    if (editMode) {
      const initialData = {};
      images.forEach(image => {
        const versionData = getVersionData(image.id);
        if (versionData) {
          initialData[versionData.id] = { ...versionData };
        }
      });
      setEditData(initialData);
    }
  }, [editMode, images, versions, activeVersions, getVersionData]);

  // Ensure we have versions for all images
  useEffect(() => {
    const loadAllVersions = async () => {
      for (const image of images) {
        console.log(`Fetching versions for image ${image.id}`);
        if (!versions[image.id]) {
          await fetchVersions(image.id);
        }
      }
      
      // After fetching, log versions state
      console.log("Versions state:", versions);
      console.log("Active versions state:", activeVersions);
    };
    
    if (images.length > 0) {
      loadAllVersions();
    }
  }, [images, versions, fetchVersions]);

  // Handle field changes in edit mode
  const handleFieldChange = (versionId, updatedData) => {
    setEditData(prev => ({
      ...prev,
      [versionId]: {
        ...prev[versionId],
        ...updatedData
      }
    }));
  };

  // Handle saving changes
  const handleSaveChanges = async () => {
    // Track successes and failures
    let successCount = 0;
    let failCount = 0;
    
    // Save each version's changes
    for (const [versionId, data] of Object.entries(editData)) {
      try {
        await updateVersion(parseInt(versionId), data);
        successCount++;
      } catch (error) {
        console.error(`Failed to update version ${versionId}:`, error);
        failCount++;
      }
    }
    
    // Show result feedback
    alert(`Updates: ${successCount} succeeded, ${failCount} failed`);
    
    // Exit edit mode
    setEditMode(false);
  };

  // Handle image deletion
  const handleDelete = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteImage(imageId);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Handle extraction
  const handleExtract = async (imageId) => {
    try {
      await extractContactInfo(imageId);
    } catch (error) {
      console.error('Extraction failed:', error);
    }
  };

  // Show image preview
  const handleImageClick = (thumbnail) => {
    setSelectedImageUrl(thumbnail);
  };

  // Show loading if no images
  if (!images?.length) {
    return (
      <div className="text-text-muted text-center py-8">
        No images in database
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ImageViewModal 
        imageUrl={selectedImageUrl} 
        onClose={() => setSelectedImageUrl(null)}
      />
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-text">Database Contents</h2>
        
        <button
          onClick={editMode ? handleSaveChanges : () => setEditMode(true)}
          className={`px-4 py-2 rounded transition-colors shadow-sm font-medium ${
            editMode 
              ? 'bg-success hover:bg-success/90 text-text-on-primary' 
              : 'bg-primary hover:bg-primary/90 text-text-on-primary'
          }`}
        >    
          {editMode ? 'Save Changes' : 'Edit All'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map(image => {
          // Get the active version for this image
          const versionId = activeVersions[image.id];
          const versionData = editMode 
            ? (versionId ? editData[versionId] : null)
            : getVersionData(image.id);

          // Log to see what's happening
          console.log(`Image ${image.id}:`, {
            versionId,
            versionData,
            editMode,
            editDataExists: versionId ? !!editData[versionId] : false
          });

          if (!versionData) {
            console.log(`No version data for image ${image.id}`);
            return null;
          }
          
          return (
            <div key={image.id} className="border border-border rounded-lg shadow-sm bg-background p-4 space-y-4">
              {/* Image and controls section */}
              <div className="flex">
                {/* Image thumbnail */}
                <div 
                  className="w-32 h-32 bg-background-alt rounded flex items-center justify-center cursor-pointer"
                  onClick={() => handleImageClick(image.thumbnail)}
                >
                  {image.thumbnail ? (
                    <img
                      src={image.thumbnail}
                      alt="Contact info card"
                      className="object-contain w-full h-full rounded"
                    />
                  ) : (
                    <div className="text-text-muted flex flex-col items-center justify-center w-full h-full">
                      <span className="text-xs">No thumbnail</span>
                    </div>
                  )}
                </div>
                
                {/* Version selector and actions */}
                <div className="flex-1 ml-4 flex flex-col space-y-2">
                  <VersionSelector imageId={image.id} />
                  
                  <div className="flex-1"></div>
                  
                  {/* Action buttons */}
                  <button
                    onClick={() => handleExtract(image.id)}
                    disabled={operationStatus[`extract-${image.id}`]?.loading || editMode}
                    className="w-full px-2 py-1 text-sm bg-secondary hover:bg-secondary/90 text-white rounded disabled:opacity-50"
                  >
                    {operationStatus[`extract-${image.id}`]?.loading ? 'Extracting...' : 'Extract Info'}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedImageForPivot(image.id);
                      setShowPivotTable(true);
                    }}
                    disabled={editMode}
                    className="w-full px-2 py-1 text-sm bg-primary hover:bg-primary/90 text-white rounded disabled:opacity-50"
                  >
                    Compare Versions
                  </button>
                  
                  <button
                    onClick={() => handleDelete(image.id)}
                    disabled={operationStatus[`delete-${image.id}`]?.loading || editMode}
                    className="w-full px-2 py-1 text-sm bg-error hover:bg-error/90 text-white rounded disabled:opacity-50"
                  >
                    Delete Entry
                  </button>
                </div>
              </div>
              
              {/* Version data section */}
              <div className="border-t border-border pt-4">
                <VersionFields
                  data={versionData}
                  onChange={editMode ? (updatedData) => handleFieldChange(versionId, updatedData) : null}
                  disabled={!editMode}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Modal for version comparison */}
      {showPivotTable && selectedImageForPivot && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
            <VersionPivotTable 
              imageId={selectedImageForPivot} 
              onClose={() => setShowPivotTable(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DatabaseViewer;