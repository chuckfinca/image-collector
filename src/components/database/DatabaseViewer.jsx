import React, { useState, useEffect } from 'react';
import { useDb } from '../../context/DatabaseContext';
import VersionSelector from '../version/VersionSelector';
import { VersionFields } from '../fields/SimpleFields';
import ImageViewModal from '../image/ImageViewModal';
import VersionPivotTable from '../version/VersionPivotTable';
import { sanitizeContactData } from '../../utils/data-sanitization';

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
    let successCount = 0;
    let failCount = 0;
    
    for (const [versionId, data] of Object.entries(editData)) {
      try {
        // Use the simplified sanitization function
        const sanitizedData = sanitizeContactData(data);
        
        // Send sanitized data to the server
        await updateVersion(parseInt(versionId), sanitizedData);
        successCount++;
      } catch (error) {
        console.error(`Failed to update version ${versionId}:`, error);
        failCount++;
      }
    }
    
    alert(`Updates: ${successCount} succeeded, ${failCount} failed`);
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

          if (!versionData) {
            console.log(`No version data for image ${image.id}`);
            return null;
          }
          
          return (
            <div key={image.id} className="border border-border rounded-lg shadow-sm bg-background p-4 space-y-4 relative">
              {/* Image and actions section - flipped layout (image left, buttons right) */}
              <div className="flex">
                {/* Left side - Image thumbnail with delete button positioned over it */}
                <div 
                  className="w-40 h-32 bg-background-alt rounded flex items-center justify-center cursor-pointer mr-4 relative"
                  onClick={() => handleImageClick(image.thumbnail)}
                >
                  {/* Super simple text-based delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent image click
                      handleDelete(image.id);
                    }}
                    disabled={operationStatus[`delete-${image.id}`]?.loading || editMode}
                    className="absolute -top-1.5 -right-1.5 z-10"
                    style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(139, 92, 246, 0.5)',  // Transparent Purple background
                      border: 'none',
                      borderRadius: '4px',  // Slightly rounded rectangle
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: 'rgba(255, 255, 255, 0.6)',
                      lineHeight: '1',
                      padding: '0'
                    }}
                    title="Delete Entry"
                  >
                    ×
                  </button>
                  
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
                
                {/* Right side - action buttons */}
                <div className="flex-grow flex flex-col space-y-2 justify-center">
                  <button
                    onClick={() => handleExtract(image.id)}
                    disabled={operationStatus[`extract-${image.id}`]?.loading || editMode}
                    className="w-full px-2 py-1.5 text-sm bg-secondary hover:bg-secondary/90 text-white rounded disabled:opacity-50"
                  >
                    {operationStatus[`extract-${image.id}`]?.loading ? 'Extracting...' : 'Extract Info'}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedImageForPivot(image.id);
                      setShowPivotTable(true);
                    }}
                    disabled={editMode}
                    className="w-full px-2 py-1.5 text-sm bg-primary hover:bg-primary/90 text-white rounded disabled:opacity-50"
                  >
                    Compare Versions
                  </button>
                </div>
              </div>
              
              {/* Version selector below image */}
              <VersionSelector imageId={image.id} />
              
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