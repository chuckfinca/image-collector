import React, { useState } from 'react';
import ImageViewModal from './ImageViewModal'

function DatabaseViewer({ images, onUpdateImage }) {
  const [editMode, setEditMode] = useState(false);
  const [editableImages, setEditableImages] = useState([]);
  const [validationState, setValidationState] = useState({});
  const [extracting, setExtracting] = useState({});  // Track extraction state per image
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  const handleDelete = async (imageId) => {
    // Show built-in confirmation dialog
    if (!window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8000/image/${imageId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
      
      // Use onUpdateImage as a trigger to fetch images
      await onUpdateImage(imageId, {});
      
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image: ' + error.message);
    }
  };

  if (!images || images.length === 0) {
    return (
      <div className="text-gray-400 text-center py-8">
        No images in database
      </div>
    );
  }

  const handleExtract = async (imageId) => {
    try {
      setExtracting(prev => ({ ...prev, [imageId]: true }));
      
      const response = await fetch(`http://localhost:8000/extract/${imageId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to extract contact information');
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        // Get the current image data
        const currentImageData = editMode 
          ? editableImages.find(img => img.id === imageId)
          : images.find(img => img.id === imageId);

        // Merge the extracted data with existing data
        const updatedData = {
          ...currentImageData,
          ...result.data,
          // Ensure arrays are properly handled
          phone_numbers: result.data.phone_numbers || currentImageData.phone_numbers,
          email_addresses: result.data.email_addresses || currentImageData.email_addresses,
          url_addresses: result.data.url_addresses || currentImageData.url_addresses
        };

        // Update both the editable state and the backend
        if (editMode) {
          setEditableImages(prev => 
            prev.map(img => img.id === imageId ? updatedData : img)
          );
        }

        // Update the backend and trigger a refresh
        await onUpdateImage(imageId, result.data);
        alert('Successfully extracted contact information!');
      } else {
        throw new Error('No data received from extraction service');
      }
    } catch (error) {
      console.error('Error extracting contact info:', error);
      alert(`Error extracting contact info: ${error.message}`);
    } finally {
      setExtracting(prev => ({ ...prev, [imageId]: false }));
    }
  };
  
  // Validation functions remain the same
  const validateField = (value, type) => {
    if (!value) return true;
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        return /^https?:\/\/[^\s]+$/.test(value);
      default:
        return true;
    }
  };

  const validateArray = (values, type) => {
    if (!values?.length) return true;
    return values.every(value => !value.trim() || validateField(value.trim(), type));
  };

  const updateValidation = (imageId, field, valid) => {
    setValidationState(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        [field]: valid
      }
    }));
  };

  const handleEditToggle = () => {
    if (editMode) {
      editableImages.forEach(image => {
        onUpdateImage(image.id, {
          name_prefix: image.name_prefix,
          given_name: image.given_name,
          middle_name: image.middle_name,
          family_name: image.family_name,
          name_suffix: image.name_suffix,
          job_title: image.job_title,
          department: image.department,
          organization_name: image.organization_name,
          phone_numbers: image.phone_numbers?.filter(p => p.trim()),
          email_addresses: image.email_addresses?.filter(e => e.trim()),
          url_addresses: image.url_addresses?.filter(u => u.trim())
        });
      });
      setEditMode(false);
    } else {
      setEditableImages(JSON.parse(JSON.stringify(images)));
      setValidationState({});
      setEditMode(true);
    }
  };

  const handleInputChange = (imageId, field, value) => {
    setEditableImages(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { ...img, [field]: value }
          : img
      )
    );
  };

  const handleArrayInputChange = (imageId, field, value, validationType) => {
    const arrayValue = value.split('\n');
    setEditableImages(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { ...img, [field]: arrayValue }
          : img
      )
    );
    const isValid = validateArray(arrayValue, validationType);
    updateValidation(imageId, field, isValid);
  };

  const getValidationMessage = (imageId, field) => {
    if (!editMode || validationState[imageId]?.[field] !== false) return null;
    switch (field) {
      case 'email_addresses':
        return 'One or more invalid email addresses';
      case 'url_addresses':
        return 'One or more invalid URLs';
      default:
        return 'Invalid input';
    }
  };

  const getFieldClassName = (imageId, field) => {
    const baseClasses = "w-full px-2 py-1 bg-gray-700 border rounded disabled:opacity-75 disabled:cursor-not-allowed";
    if (!editMode) return `${baseClasses} border-gray-600`;
    const isInvalid = validationState[imageId]?.[field] === false;
    return `${baseClasses} ${
      isInvalid 
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
        : 'border-gray-600 focus:border-blue-500 focus:ring-blue-500'
    }`;
  };

  return (
    <div className="space-y-4">
      <ImageViewModal imageUrl={selectedImageUrl} onClose={() => setSelectedImageUrl(null)}/>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-200">Database Contents</h2>
        <button
          onClick={handleEditToggle}
          className={`px-4 py-2 rounded transition-colors ${
            editMode 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {editMode ? 'Save Changes' : 'Edit All'}
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-700 rounded-lg">
        <table className="w-full border-collapse">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-4 text-left text-gray-200 align-top">Image</th>
              <th className="p-4 text-left text-gray-200 align-top">Name Info</th>
              <th className="p-4 text-left text-gray-200 align-top">Work Info</th>
              <th className="p-4 text-left text-gray-200 align-top">Contact Info</th>
              <th className="p-4 text-left text-gray-200 align-top">Online Presence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {(editMode ? editableImages : images).map((image) => (
              <tr key={image.id} className="hover:bg-gray-800/50">
                <td className="p-4 align-top">
                  <div className="w-32 h-32 bg-gray-800 rounded flex items-center justify-center">
                    {image.thumbnail ? (
                      <img
                        src={image.thumbnail}
                        alt="Business card"
                      className="object-contain w-full h-full rounded cursor-pointer"
                      onDoubleClick={async () => {
                        try {
                          const response = await fetch(`http://localhost:8000/image/${image.id}`);
                          if (!response.ok) {
                            throw new Error('Failed to fetch full image');
                          }
                          const data = await response.json();
                          setSelectedImageUrl(data.image_data);
                        } catch (error) {
                          console.error('Error loading full image:', error);
                        }
                      }}
                      />
                    ) : (
                      <div className="text-gray-500">No image</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Added: {new Date(image.date_added).toLocaleString()}
                  </div>
                  <button
                    onClick={() => handleExtract(image.id)}
                    disabled={extracting[image.id] || !editMode}
                    className="mt-2 w-full px-2 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 transition-colors"
                  >
                    {extracting[image.id] ? 'Extracting...' : 'Extract Contact Info'}
                  </button>
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="mt-2 w-full px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    Delete Entry
                  </button>
                </td>
                <td className="p-4 align-top">
                  <div className="space-y-2">
                    <div>
                      <label className="block font-medium text-gray-300 mb-1">Prefix</label>
                      <input
                        type="text"
                        value={image.name_prefix || ''}
                        onChange={(e) => handleInputChange(image.id, 'name_prefix', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'name_prefix')}
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-300 mb-1">First Name</label>
                      <input
                        type="text"
                        value={image.given_name || ''}
                        onChange={(e) => handleInputChange(image.id, 'given_name', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'given_name')}
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-300 mb-1">Middle Name</label>
                      <input
                        type="text"
                        value={image.middle_name || ''}
                        onChange={(e) => handleInputChange(image.id, 'middle_name', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'middle_name')}
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-300 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={image.family_name || ''}
                        onChange={(e) => handleInputChange(image.id, 'family_name', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'family_name')}
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-300 mb-1">Suffix</label>
                      <input
                        type="text"
                        value={image.name_suffix || ''}
                        onChange={(e) => handleInputChange(image.id, 'name_suffix', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'name_suffix')}
                      />
                    </div>
                  </div>
                </td>

                <td className="p-4 align-top">
                  <div className="space-y-2">
                    <div>
                      <label className="block font-medium text-gray-300 mb-1">Job Title</label>
                      <input
                        type="text"
                        value={image.job_title || ''}
                        onChange={(e) => handleInputChange(image.id, 'job_title', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'job_title')}
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-300 mb-1">Department</label>
                      <input
                        type="text"
                        value={image.department || ''}
                        onChange={(e) => handleInputChange(image.id, 'department', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'department')}
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-300 mb-1">Organization</label>
                      <input
                        type="text"
                        value={image.organization_name || ''}
                        onChange={(e) => handleInputChange(image.id, 'organization_name', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'organization_name')}
                      />
                    </div>
                  </div>
                </td>

                <td className="p-4 align-top">
                  <div className="space-y-4">
                    <div>
                      <label className="block font-medium text-gray-300 mb-1">Phone Numbers<br></br>(line separated)</label>
                      <textarea
                        value={(image.phone_numbers || []).join('\n')}
                        onChange={(e) => handleArrayInputChange(image.id, 'phone_numbers', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'phone_numbers')}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-300 mb-1">Email Addresses<br></br>(line separated)</label>
                      <textarea
                        value={(image.email_addresses || []).join('\n')}
                        onChange={(e) => handleArrayInputChange(image.id, 'email_addresses', e.target.value, 'email')}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'email_addresses')}
                        rows={3}
                      />
                      {getValidationMessage(image.id, 'email_addresses') && (
                        <div className="text-sm text-red-400 mt-1">
                          {getValidationMessage(image.id, 'email_addresses')}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="p-4 align-top">
                  <div>
                    <label className="block font-medium text-gray-300 mb-1">URLs<br></br>(line separated)</label>
                    <textarea
                      value={(image.url_addresses || []).join('\n')}
                      onChange={(e) => handleArrayInputChange(image.id, 'url_addresses', e.target.value, 'url')}
                      disabled={!editMode}
                      className={getFieldClassName(image.id, 'url_addresses')}
                      rows={3}
                    />
                    {getValidationMessage(image.id, 'url_addresses') && (
                      <div className="text-sm text-red-400 mt-1">
                        {getValidationMessage(image.id, 'url_addresses')}
                      </div>
                    )}
                  </div>
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