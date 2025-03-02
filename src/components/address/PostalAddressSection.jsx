import React from 'react';

function PostalAddressSection({ image, editMode, editableImages, handleInputChange }) {
  // If in edit mode, use the editable image data, otherwise use the original image data
  const currentImage = editMode 
    ? editableImages.find(img => img.id === image.id) 
    : image;
  
  // Get postal addresses from the image, default to empty array if not present
  const postalAddresses = currentImage.postal_addresses || [];
  
  // If no addresses and not in edit mode, don't render the section
  if (!postalAddresses.length && !editMode) {
    return null;
  }

  const getFieldClassName = (field) => {
    const baseClasses = "w-full px-2 py-1 bg-background-alt border rounded text-sm disabled:opacity-75 disabled:cursor-not-allowed";
    return `${baseClasses} ${editMode ? 'border-border focus:border-primary focus:ring-primary' : 'border-border'}`;
  };

  // Render a single postal address with all its fields
  const renderPostalAddress = (address, index) => (
    <div key={index} className="p-3 mb-2 border border-border rounded bg-background-alt/50">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="block text-xs text-text-muted">Street</label>
          <input
            type="text"
            value={address.street || ''}
            onChange={(e) => handleAddressFieldChange(index, 'street', e.target.value)}
            disabled={!editMode}
            className={getFieldClassName()}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-text-muted">City</label>
          <input
            type="text"
            value={address.city || ''}
            onChange={(e) => handleAddressFieldChange(index, 'city', e.target.value)}
            disabled={!editMode}
            className={getFieldClassName()}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-text-muted">State/Province</label>
          <input
            type="text"
            value={address.state || ''}
            onChange={(e) => handleAddressFieldChange(index, 'state', e.target.value)}
            disabled={!editMode}
            className={getFieldClassName()}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-text-muted">Postal Code</label>
          <input
            type="text"
            value={address.postal_code || ''}
            onChange={(e) => handleAddressFieldChange(index, 'postal_code', e.target.value)}
            disabled={!editMode}
            className={getFieldClassName()}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-text-muted">Country</label>
          <input
            type="text"
            value={address.country || ''}
            onChange={(e) => handleAddressFieldChange(index, 'country', e.target.value)}
            disabled={!editMode}
            className={getFieldClassName()}
          />
        </div>
      </div>
      
      {editMode && (
        <button
          onClick={() => handleRemoveAddress(index)}
          className="mt-2 px-2 py-1 text-xs bg-error text-white rounded hover:bg-error/90"
        >
          Remove Address
        </button>
      )}
    </div>
  );

  // Handle changes to specific fields in an address
  const handleAddressFieldChange = (addressIndex, field, value) => {
    const updatedAddresses = [...postalAddresses];
    
    // Ensure the address object exists
    if (!updatedAddresses[addressIndex]) {
      updatedAddresses[addressIndex] = {};
    }
    
    // Update the specific field
    updatedAddresses[addressIndex][field] = value;
    
    // Pass the entire updated addresses array to the parent component
    handleInputChange(image.id, 'postal_addresses', updatedAddresses);
  };
  
  // Handle removing an address
  const handleRemoveAddress = (addressIndex) => {
    const updatedAddresses = postalAddresses.filter((_, index) => index !== addressIndex);
    handleInputChange(image.id, 'postal_addresses', updatedAddresses);
  };
  
  // Add a new empty address
  const handleAddAddress = () => {
    const updatedAddresses = [...postalAddresses, {
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: ''
    }];
    handleInputChange(image.id, 'postal_addresses', updatedAddresses);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-text">Postal Addresses</h3>
      
      <div className="space-y-3">
        {postalAddresses.map((address, index) => renderPostalAddress(address, index))}
        
        {editMode && (
          <button
            onClick={handleAddAddress}
            className="w-full mt-2 px-2 py-1 text-sm bg-background-alt text-text-muted rounded hover:bg-background-alt/80"
          >
            + Add Address
          </button>
        )}
        
        {!postalAddresses.length && !editMode && (
          <div className="text-sm text-text-muted">No addresses</div>
        )}
      </div>
    </div>
  );
}

export default PostalAddressSection;