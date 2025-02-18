import React, { useState, useEffect } from 'react';

function DatabaseViewer({ images, onUpdateImage }) {
  const [editMode, setEditMode] = useState(false);
  const [editableImages, setEditableImages] = useState([]);
  const [validationState, setValidationState] = useState({});

  if (!images || images.length === 0) {
    return (
      <div className="text-gray-400 text-center py-8">
        No images in database
      </div>
    );
  }

  // Validate a single field
  const validateField = (value, type) => {
    if (!value) return true; // Empty values are considered valid

    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        return /^https?:\/\/[^\s]+$/.test(value);
      default:
        return true;
    }
  };

  // Validate an array of values
  const validateArray = (values, type) => {
    if (!values?.length) return true;
    return values.every(value => !value.trim() || validateField(value.trim(), type));
  };

  // Update validation state for a specific field
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
      // Save all changes regardless of validation state
      editableImages.forEach(image => {
        onUpdateImage(image.id, {
          given_name: image.given_name,
          family_name: image.family_name,
          job_title: image.job_title,
          organization_name: image.organization_name,
          phone_numbers: image.phone_numbers?.filter(p => p.trim()),
          email_addresses: image.email_addresses?.filter(e => e.trim()),
          url_addresses: image.url_addresses?.filter(u => u.trim())
        });
      });
      setEditMode(false);
    } else {
      // Enter edit mode
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
    
    // Update the editable data
    setEditableImages(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { ...img, [field]: arrayValue }
          : img
      )
    );

    // Validate immediately
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
              <th className="p-4 text-left text-gray-200">Image</th>
              <th className="p-4 text-left text-gray-200">Name Info</th>
              <th className="p-4 text-left text-gray-200">Work Info</th>
              <th className="p-4 text-left text-gray-200">Contact Info</th>
              <th className="p-4 text-left text-gray-200">Online Presence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {(editMode ? editableImages : images).map((image) => (
              <tr key={image.id} className="hover:bg-gray-800/50">
                {/* Image Column */}
                <td className="p-4">
                  <div className="w-32 h-32 bg-gray-800 rounded flex items-center justify-center">
                    {image.thumbnail ? (
                      <img
                        src={image.thumbnail}
                        alt="Business card"
                        className="object-contain w-full h-full rounded"
                      />
                    ) : (
                      <div className="text-gray-500">No image</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Added: {new Date(image.date_added).toLocaleString()}
                  </div>
                </td>

                {/* Name Information */}
                <td className="p-4">
                  <div className="space-y-2">
                    <div>
                      <div className="font-medium text-gray-300">First Name</div>
                      <input
                        type="text"
                        value={image.given_name || ''}
                        onChange={(e) => handleInputChange(image.id, 'given_name', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'given_name')}
                      />
                    </div>
                    <div>
                      <div className="font-medium text-gray-300">Last Name</div>
                      <input
                        type="text"
                        value={image.family_name || ''}
                        onChange={(e) => handleInputChange(image.id, 'family_name', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'family_name')}
                      />
                    </div>
                  </div>
                </td>

                {/* Work Information */}
                <td className="p-4">
                  <div className="space-y-2">
                    <div>
                      <div className="font-medium text-gray-300">Job Title</div>
                      <input
                        type="text"
                        value={image.job_title || ''}
                        onChange={(e) => handleInputChange(image.id, 'job_title', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'job_title')}
                      />
                    </div>
                    <div>
                      <div className="font-medium text-gray-300">Organization</div>
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

                {/* Contact Information */}
                <td className="p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="font-medium text-gray-300 mb-1">Phone Numbers</div>
                      <textarea
                        value={(image.phone_numbers || []).join('\n')}
                        onChange={(e) => handleArrayInputChange(image.id, 'phone_numbers', e.target.value)}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'phone_numbers')}
                        rows={3}
                      />
                    </div>
                    <div>
                      <div className="font-medium text-gray-300 mb-1">Email Addresses</div>
                      <textarea
                        value={(image.email_addresses || []).join('\n')}
                        onChange={(e) => handleArrayInputChange(image.id, 'email_addresses', e.target.value, 'email')}
                        disabled={!editMode}
                        className={getFieldClassName(image.id, 'email_addresses')}
                        rows={3}
                      />
                      {editMode && (
                        <div className="text-sm text-red-400 mt-1">
                          {getValidationMessage(image.id, 'email_addresses')}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Online Presence */}
                <td className="p-4">
                  <div>
                    <div className="font-medium text-gray-300 mb-1">URLs</div>
                    <textarea
                      value={(image.url_addresses || []).join('\n')}
                      onChange={(e) => handleArrayInputChange(image.id, 'url_addresses', e.target.value, 'url')}
                      disabled={!editMode}
                      className={getFieldClassName(image.id, 'url_addresses')}
                      rows={3}
                    />
                    {editMode && (
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