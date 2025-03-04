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
    totalImages
  } = useDb();

  const {
    editMode,
    editableImages,
    validationState,
    handleEditToggle,
    handleInputChange,
    handleArrayInputChange
  } = useImageEditor(images, updateImage);

  const [selectedImageUrl, setSelectedImageUrl] = React.useState(null);

  console.log("DatabaseViewer received images:", images);
  
  if (!images?.length) {
    return (
      <div className="text-text-muted text-center py-8">
        No images in database
      </div>
    );
  }

  const getFieldClassName = (imageId, field) => {
    const baseClasses = "w-full px-2 py-1 bg-background-alt border rounded text-sm disabled:opacity-75 disabled:cursor-not-allowed";
    if (!editMode) return `${baseClasses} border-border`;
    const isInvalid = validationState[imageId]?.[field] === false;
    return `${baseClasses} ${
      isInvalid 
        ? 'border-error focus:border-error focus:ring-error' 
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
            {(editMode ? editableImages : images).map((image) => (
              <tr key={image.id} className="hover:bg-background-alt/50">
                <td className="p-3 align-top">
                  <ImageThumbnail
                    image={image}
                    onSetSelectedImageUrl={setSelectedImageUrl}
                    editMode={editMode}
                  />
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