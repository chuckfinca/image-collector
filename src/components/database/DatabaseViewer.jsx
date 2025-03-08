import React from 'react';
import { useDb } from '../../context/DatabaseContext';
import { useImageEditor } from '../../hooks/useImageEditor';
import ImageViewModal from '../image/ImageViewModal';
import ImageThumbnail from '../image/ImageThumbnail';
import PostalAddressSection from '../address/PostalAddressSection';

function DatabaseViewer() {
  const { 
    images,
    updateImage,
    totalImages,
    versions,
    activeVersions,
    updateVersionData
  } = useDb();

  const [selectedImageUrl, setSelectedImageUrl] = React.useState(null);

  // Create display images BEFORE using them in the hook
  const displayImages = images.map(image => {
    // Check if there's an active version for this image
    const activeVersionId = activeVersions[image.id];
    
    // If no active version, just return the original image
    if (!activeVersionId) return image;
    
    // Find the version data
    const imageVersions = versions[image.id] || [];
    const activeVersion = imageVersions.find(v => v.id === activeVersionId);
    
    if (!activeVersion) return image;
    
    // Create a new object with image data as base, overlaid with version data
    return {
      ...image,
      // Apply each field from the version if it exists
      name_prefix: activeVersion.name_prefix !== undefined ? activeVersion.name_prefix : image.name_prefix,
      given_name: activeVersion.given_name !== undefined ? activeVersion.given_name : image.given_name,
      middle_name: activeVersion.middle_name !== undefined ? activeVersion.middle_name : image.middle_name,
      family_name: activeVersion.family_name !== undefined ? activeVersion.family_name : image.family_name,
      name_suffix: activeVersion.name_suffix !== undefined ? activeVersion.name_suffix : image.name_suffix,
      job_title: activeVersion.job_title !== undefined ? activeVersion.job_title : image.job_title,
      department: activeVersion.department !== undefined ? activeVersion.department : image.department,
      organization_name: activeVersion.organization_name !== undefined ? activeVersion.organization_name : image.organization_name,
      phone_numbers: activeVersion.phone_numbers || image.phone_numbers || [],
      email_addresses: activeVersion.email_addresses || image.email_addresses || [],
      url_addresses: activeVersion.url_addresses || image.url_addresses || [],
      postal_addresses: activeVersion.postal_addresses || image.postal_addresses || [],
      // Add indicator that this is a version overlay
      _displayedVersionId: activeVersionId,
      _versionTag: activeVersion.tag
    };
  });

  // AFTER creating displayImages, now we can use the hook
  const {
    editMode,
    editableImages,
    validationState,
    handleEditToggle,
    handleInputChange,
    handleArrayInputChange
  } = useImageEditor(displayImages, updateImage, updateVersionData, activeVersions);

  if (!images?.length) {
    return (
      <div className="text-text-muted text-center py-8">
        No images in database
      </div>
    );
  }

  const getFieldClassName = (imageId, field) => {
    const baseClasses = "w-full px-2 py-1 bg-background-alt border rounded text-sm disabled:opacity-75 disabled:cursor-not-allowed";
    
    // Add special styling for version fields
    const hasActiveVersion = !!activeVersions[imageId];
    const versionStyled = hasActiveVersion ? 'border-secondary' : 'border-border';
    
    if (!editMode) return `${baseClasses} ${versionStyled}`;
    
    const isInvalid = validationState[imageId]?.[field] === false;
    return `${baseClasses} ${
      isInvalid 
        ? 'border-error focus:border-error focus:ring-error' 
        : hasActiveVersion
          ? 'border-secondary focus:border-secondary focus:ring-secondary' 
          : 'border-border focus:border-primary focus:ring-primary'
    }`;
  };

  const renderTextField = (image, field, label = '') => (
    <div className="space-y-1">
      <label className="block text-xs text-text-muted">{label}</label>
      <input
        type="text"
        value={editMode ? editableImages.find(img => img.id === image.id)?.[field] || '' : image[field] || ''}
        onChange={(e) => handleInputChange(image.id, field, e.target.value)}
        disabled={!editMode}
        className={getFieldClassName(image.id, field)}
      />
    </div>
  );

  const renderArrayField = (image, field, label = '') => (
    <div className="space-y-1">
      <label className="block text-xs text-text-muted">{label}</label>
      <textarea
        value={editMode 
          ? editableImages.find(img => img.id === image.id)?.[field]?.join('\n') || ''
          : (image[field] || []).join('\n')
        }
        onChange={(e) => handleArrayInputChange(image.id, field, e.target.value, field.replace('_addresses', ''))}
        disabled={!editMode}
        rows={2}
        className={getFieldClassName(image.id, field)}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <ImageViewModal 
        imageUrl={selectedImageUrl} 
        onClose={() => setSelectedImageUrl(null)}
      />
      
      <div className="flex justify-between items-center">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-bold text-text">Database Contents</h2>
          <span className="text-sm text-text-muted">({totalImages} images)</span>
        </div>
        
        <button
          onClick={handleEditToggle}
          className={`px-4 py-2 rounded transition-colors shadow-sm font-medium ${
            editMode 
              ? 'bg-success hover:bg-success/90 text-text-on-primary border border-success' 
              : 'bg-primary hover:bg-primary/90 text-text-on-primary border border-primary'
          }`}
        >    
          {editMode ? 'Save Changes' : 'Edit All'}
        </button>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg shadow-sm bg-background-subtle">
        <table className="w-full border-collapse">
          <thead className="bg-background-alt">
            <tr>
              <th className="p-3 text-left text-text align-top font-medium text-sm border-b border-border-subtle">Image</th>
              <th className="p-3 text-left text-text align-top font-medium text-sm border-b border-border-subtle">Name Info</th>
              <th className="p-3 text-left text-text align-top font-medium text-sm border-b border-border-subtle">Work Info</th>
              <th className="p-3 text-left text-text align-top font-medium text-sm border-b border-border-subtle">Contact Info</th>
              <th className="p-3 text-left text-text align-top font-medium text-sm border-b border-border-subtle">Online Presence</th>
              <th className="p-3 text-left text-text align-top font-medium text-sm border-b border-border-subtle">Addresses</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {(editMode ? editableImages : displayImages).map((image) => (
              <tr key={image.id} className={`hover:bg-background-alt/50 ${image._displayedVersionId ? 'bg-secondary/5' : ''}`}>
                <td className="p-3 align-top">
                  <ImageThumbnail
                    image={image}
                    onSetSelectedImageUrl={setSelectedImageUrl}
                    editMode={editMode}
                  />
                  
                  {/* Version indicator */}
                  {image._displayedVersionId && !editMode && (
                    <div className="mt-2 text-xs py-1 px-2 bg-secondary/20 text-secondary rounded">
                      Showing version: {image._versionTag}
                    </div>
                  )}
                </td>
                <td className="p-3 align-top">
                  <div className="space-y-2">
                    {renderTextField(image, 'name_prefix', 'Prefix')}
                    {renderTextField(image, 'given_name', 'Given Name')}
                    {renderTextField(image, 'middle_name', 'Middle Name')}
                    {renderTextField(image, 'family_name', 'Family Name')}
                    {renderTextField(image, 'name_suffix', 'Suffix')}
                  </div>
                </td>
                <td className="p-3 align-top">
                  <div className="space-y-2">
                    {renderTextField(image, 'job_title', 'Job Title')}
                    {renderTextField(image, 'department', 'Department')}
                    {renderTextField(image, 'organization_name', 'Organization')}
                  </div>
                </td>
                <td className="p-3 align-top">
                  <div className="space-y-2">
                    {renderArrayField(image, 'phone_numbers', 'Phone Numbers (one per line)')}
                    {renderArrayField(image, 'email_addresses', 'Email Addresses (one per line)')}
                  </div>
                </td>
                <td className="p-3 align-top">
                  <div className="space-y-2">
                    {renderArrayField(image, 'url_addresses', 'URLs (one per line)')}
                  </div>
                </td>
                <td className="p-3 align-top">
                  <PostalAddressSection 
                    image={image}
                    editMode={editMode}
                    editableImages={editableImages}
                    handleInputChange={handleInputChange}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DatabaseViewer;