import React, { useState, useEffect, useMemo } from 'react';
import { useDb } from '../../context/DatabaseContext';
import { sanitizeContactData, detectChanges } from '../../utils/data-sanitization';


function VersionPivotTable({ imageId, onClose }) {
  const { versions, fetchVersions, updateVersionData } = useDb();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editableData, setEditableData] = useState({});
  
  // Define field groups
  const fieldGroups = {
    'Name Information': [
      { id: 'name_prefix', label: 'Prefix' },
      { id: 'given_name', label: 'Given Name' },
      { id: 'middle_name', label: 'Middle Name' },
      { id: 'family_name', label: 'Family Name' },
      { id: 'name_suffix', label: 'Suffix' }
    ],
    'Work Information': [
      { id: 'organization_name', label: 'Organization' },
      { id: 'department', label: 'Department' },
      { id: 'job_title', label: 'Job Title' }
    ],
    'Contact Information': [
      { id: 'phone_numbers', label: 'Phone Numbers', isArray: true },
      { id: 'email_addresses', label: 'Email Addresses', isArray: true },
      { id: 'url_addresses', label: 'URLs', isArray: true },
      { id: 'postal_addresses', label: 'Postal Addresses', isArray: true, isComplex: true }
    ]
  };

  // Create a flat list of all field IDs (after field groups are defined)
  const allFieldIds = useMemo(() => {
    return Object.values(fieldGroups).flatMap(group => 
      group.map(field => field.id)
    );
  }, []);  // Empty dependency array means this only runs once
  
  // Now initialize selectedFields with all fields
  const [selectedFields, setSelectedFields] = useState(allFieldIds);

  // Fetch versions when component mounts
  useEffect(() => {
    const loadVersions = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!versions[imageId]) {
          await fetchVersions(imageId);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching versions:', err);
        setError(`Failed to load versions: ${err.message}`);
        setLoading(false);
      }
    };
    
    loadVersions();
  }, [imageId, fetchVersions, versions]);

  // Prepare editable data when entering edit mode
  useEffect(() => {
    if (editMode && versions[imageId] && Array.isArray(versions[imageId])) {
      const initialData = {};
      versions[imageId].forEach(version => {
        if (version && version.id) {
          initialData[version.id] = { ...version };
        }
      });
      setEditableData(initialData);
    }
  }, [editMode, versions, imageId]);

  const imageVersions = versions[imageId] || [];

  // Toggle a field in the selected fields list
  const toggleField = (fieldId) => {
    setSelectedFields(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  // Handle input changes in edit mode
  const handleInputChange = (versionId, fieldId, value) => {
    console.log(`Changing field ${fieldId} for version ${versionId} to:`, value);
    
    setEditableData(prev => {
      // Make sure the previous state exists and has the version
      const newState = { ...prev };
      if (!newState[versionId]) {
        newState[versionId] = {};
      }
      
      // Update the specific field
      newState[versionId] = {
        ...newState[versionId],
        [fieldId]: value
      };
      
      return newState;
    });
  };

  // Handle array input changes (like phone numbers)
  const handleArrayInputChange = (versionId, fieldId, value) => {
    console.log(`Changing array field ${fieldId} for version ${versionId} to:`, value);
    
    // Convert the text input to an array
    const arrayValue = value
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);
    
    setEditableData(prev => {
      // Make sure the previous state exists and has the version
      const newState = { ...prev };
      if (!newState[versionId]) {
        newState[versionId] = {};
      }
      
      // Update the specific field
      newState[versionId] = {
        ...newState[versionId],
        [fieldId]: arrayValue
      };
      
      return newState;
    });
  };
  

  const handleAddressChange = (versionId, addressIndex, field, value) => {
    setEditableData(prev => {
      const newData = {...prev};
      
      // Make sure the version exists
      if (!newData[versionId]) {
        newData[versionId] = {};
      }
      
      // Make sure the postal_addresses array exists
      if (!newData[versionId].postal_addresses) {
        newData[versionId].postal_addresses = [];
      }
      
      // Make sure the specific address object exists
      if (!newData[versionId].postal_addresses[addressIndex]) {
        newData[versionId].postal_addresses[addressIndex] = {};
      }
      
      // Update the specific field
      newData[versionId].postal_addresses[addressIndex][field] = value;
      
      return newData;
    });
  };
  
  const handleAddAddress = (versionId) => {
    setEditableData(prev => {
      const newData = {...prev};
      
      // Make sure the version exists
      if (!newData[versionId]) {
        newData[versionId] = {};
      }
      
      // Make sure the postal_addresses array exists
      if (!newData[versionId].postal_addresses) {
        newData[versionId].postal_addresses = [];
      }
      
      // Add a new empty address
      newData[versionId].postal_addresses.push({
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: ''
      });
      
      return newData;
    });
  };
  
// Save all changes
const handleSaveChanges = async () => {
  // Track successful and failed updates
  const results = {
    success: [],
    failed: []
  };

  // Keep track of validation errors
  const validationErrors = {};
  
  console.log("Starting to save changes for versions:", Object.keys(editableData));
  
  // Process one version at a time to isolate failures
  for (const [versionIdStr, data] of Object.entries(editableData)) {
    try {
      console.log(`Processing version ${versionIdStr}`);
      const versionId = parseInt(versionIdStr, 10);
      
      // Skip if not a valid number
      if (isNaN(versionId)) {
        console.error(`Invalid version ID: ${versionIdStr}`);
        results.failed.push(`Invalid version ID: ${versionIdStr}`);
        continue;
      }
      
      const originalVersion = versions[imageId]?.find(v => v.id === versionId);
      
      if (!originalVersion) {
        console.error(`Original version with ID ${versionId} not found`);
        results.failed.push(`Version ${versionId}: original not found`);
        continue;
      }
      
      console.log(`Found original version ${versionId}:`, originalVersion);
      
      // Make a copy to prevent modifying the original
      const versionDataCopy = { ...data };
      
      // Convert any string arrays that might be stored as newline-separated text
      ['phone_numbers', 'email_addresses', 'url_addresses'].forEach(field => {
        if (typeof versionDataCopy[field] === 'string') {
          versionDataCopy[field] = versionDataCopy[field]
            .split('\n')
            .map(item => item.trim())
            .filter(Boolean);
        }
      });
      
      console.log(`Prepared version data for ${versionId}:`, versionDataCopy);
      
      // Only process fields that are currently selected in the UI
      console.log(`Selected fields for validation: ${selectedFields.join(', ')}`);
      
      // Sanitize the data using the shared utility
      const { sanitizedData, validationResults, isValid } = sanitizeContactData(versionDataCopy, selectedFields);
      
      // Store validation results
      validationErrors[versionId] = validationResults;
      
      // Skip if validation failed
      if (!isValid) {
        console.error(`Validation failed for version ${versionId}:`, validationResults);
        results.failed.push(`Version ${versionId}: validation failed`);
        continue;
      }
      
      console.log(`Validation passed for version ${versionId}`);
      
      // Detect what actually changed
      const { changes, hasChanges } = detectChanges(originalVersion, sanitizedData, selectedFields);
  
      // Update version if there are changes
      if (hasChanges) {
        console.log(`Updating version ${versionId} with changes:`, changes);
        await updateVersionData(versionId, changes);
        console.log(`Successfully updated version ${versionId}`);
        results.success.push(versionId);
      } else {
        console.log(`No changes detected for version ${versionId}`);
      }
    } catch (error) {
      console.error(`Failed to update version ${versionIdStr}:`, error);
      results.failed.push(versionIdStr);
      // Continue with other versions even if one fails
    }
  }
  
  // Show detailed results in console
  console.log("Update results:", results);
  
  // Show results to user if there were any failures
  if (results.failed.length > 0) {
    console.warn(`Updates: ${results.success.length} successful, ${results.failed.length} failed`);
    // Show alert with more details
    alert(`Some updates failed (${results.failed.length}). 
    ${results.success.length} updated successfully.
    Check console for details.`);
  } else if (results.success.length > 0) {
    alert(`Successfully updated ${results.success.length} versions.`);
  } else {
    alert("No changes were made.");
  }
  
  // Refresh the versions data after all updates
  await fetchVersions(imageId);
  
  // Exit edit mode only if there were no failures, otherwise keep the form open
  if (results.failed.length === 0) {
    setEditMode(false);
  }
};

  // Render field content based on field type
  const renderFieldContent = (version, fieldId, isEditable = false) => {
    // Make sure version exists and has an id
    if (!version || !version.id) {
      return '';
    }
    
    const versionId = version.id;
    const versionData = isEditable ? (editableData[versionId] || {}) : version;
    
    // Safely check if the field exists in versionData
    if (versionData === undefined) {
      console.warn(`Version data for ${versionId} is undefined`);
      return '';
    }
    
    // Check if field is an array type
    const isArrayField = Array.isArray(versionData[fieldId]);
    
    // Special handling for postal addresses
    if (fieldId === 'postal_addresses') {
      const addresses = versionData[fieldId] || [];
      
      if (isEditable) {
        return (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {addresses.map((addr, idx) => (
              <div key={idx} className="border border-border p-2 rounded bg-background-alt/50 text-sm">
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <label className="text-xs text-text-muted">Street</label>
                    <input
                      value={addr?.street || ''}
                      onChange={(e) => handleAddressChange(versionId, idx, 'street', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted">City</label>
                    <input
                      value={addr?.city || ''}
                      onChange={(e) => handleAddressChange(versionId, idx, 'city', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted">State/Province</label>
                    <input
                      value={addr?.state || ''}
                      onChange={(e) => handleAddressChange(versionId, idx, 'state', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted">Postal Code</label>
                    <input
                      value={addr?.postal_code || ''}
                      onChange={(e) => handleAddressChange(versionId, idx, 'postal_code', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-text-muted">Country</label>
                    <input
                      value={addr?.country || ''}
                      onChange={(e) => handleAddressChange(versionId, idx, 'country', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => handleAddAddress(versionId)}
              className="w-full mt-1 px-2 py-1 text-xs bg-background-alt text-text-muted rounded hover:bg-background-alt/80 border border-border"
            >
              + Add Address
            </button>
          </div>
        );
      } else {
        // Display mode for addresses
        if (!addresses || addresses.length === 0) {
          return <span className="text-text-muted text-sm">No addresses</span>;
        }
        
        return (
          <div className="space-y-2">
            {addresses.map((addr, idx) => (
              <div key={idx} className="text-sm">
                {addr?.street && <div>{addr.street}</div>}
                <div>
                  {addr?.city && addr.city}
                  {addr?.city && addr?.state && ', '}
                  {addr?.state && addr.state}
                  {(addr?.city || addr?.state) && addr?.postal_code && ' '}
                  {addr?.postal_code && addr.postal_code}
                </div>
                {addr?.country && <div>{addr.country}</div>}
              </div>
            ))}
          </div>
        );
      }
    }
    
    // Handle regular array fields (like phone numbers, emails, URLs)
    if (isEditable) {
      return isArrayField ? (
        <textarea
          value={(versionData[fieldId] || []).join('\n')}
          onChange={(e) => handleArrayInputChange(versionId, fieldId, e.target.value)}
          className="w-full h-20 px-2 py-1 text-sm border border-border rounded"
        />
      ) : (
        <input
          type="text"
          value={versionData[fieldId] ?? ''}
          onChange={(e) => handleInputChange(versionId, fieldId, e.target.value)}
          className="w-full px-2 py-1 text-sm border border-border rounded"
        />
      );
    } else {
      // Display mode
      if (isArrayField) {
        if (!versionData[fieldId] || versionData[fieldId].length === 0) {
          return <span className="text-text-muted text-sm">None</span>;
        }
        return (versionData[fieldId] || []).map((item, idx) => (
          <div key={idx} className="mb-1">{item}</div>
        ));
      } else {
        return versionData[fieldId] !== undefined ? 
          versionData[fieldId] : 
          <span className="text-text-muted text-sm">None</span>;
      }
    }
  };  

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Version Comparison</h2>
        <div className="space-x-2">
          {editMode ? (
            <>
              <button 
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-success text-white rounded hover:bg-success/90"
              >
                Save Changes
              </button>
              <button 
                onClick={() => setEditMode(false)}
                className="px-4 py-2 bg-error text-white rounded hover:bg-error/90"
              >
                Cancel
              </button>
            </>
          ) : (
            <button 
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Edit Versions
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-background-alt text-text rounded hover:bg-background-alt/90 border border-border"
          >
            Close
          </button>
        </div>
      </div>
      
      {/* Field Selector */}
      <div className="mb-4 p-4 border border-border rounded bg-background-alt">
        <h3 className="text-sm font-medium mb-2">Select Fields to Compare:</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(fieldGroups).map(([groupName, fields]) => (
            <div key={groupName} className="space-y-1">
              <h4 className="text-xs font-medium text-text-muted">{groupName}</h4>
              {fields.map(field => (
                <label key={field.id} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.id)}
                    onChange={() => toggleField(field.id)}
                    className="mr-2"
                  />
                  {field.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {/* Version Comparison Table */}
      <div className="overflow-x-auto border border-border rounded">
        <table className="w-full border-collapse">
          <thead className="bg-background-alt">
            <tr>
              <th className="p-3 text-left text-sm font-medium border-b border-r border-border">Field</th>
              {imageVersions.map(version => (
                <th 
                  key={version.id} 
                  className="p-3 text-left text-sm font-medium border-b border-r border-border"
                >
                  <div>{version.tag}</div>
                  <div className="text-xs text-text-muted">
                    {new Date(version.created_at).toLocaleString()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Render a row for each selected field */}
            {selectedFields.map(fieldId => {
              // Find field label from our field groups
              let fieldLabel = '';
              Object.values(fieldGroups).forEach(group => {
                const field = group.find(f => f.id === fieldId);
                if (field) fieldLabel = field.label;
              });
              
              return (
                <tr key={fieldId} className="hover:bg-background-alt/50">
                  <td className="p-3 font-medium border-r border-b border-border">
                    {fieldLabel || fieldId}
                  </td>
                  {(imageVersions || []).map(version => (
                    version && version.id ? (
                      <td key={version.id} className="p-3 border-r border-b border-border">
                        {renderFieldContent(version, fieldId, editMode)}
                      </td>
                    ) : null
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VersionPivotTable;