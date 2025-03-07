import React, { useState, useEffect } from 'react';
import { useDb } from '../../context/DatabaseContext';

function VersionPivotTable({ imageId, onClose }) {
  const { versions, fetchVersions, updateVersionData } = useDb();
  const [editMode, setEditMode] = useState(false);
  const [editableData, setEditableData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFields, setSelectedFields] = useState([
    'given_name', 'family_name', 'organization_name', 'job_title', 'phone_numbers', 'email_addresses'
  ]);

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

  // Group fields by category for the field selector
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
      { id: 'url_addresses', label: 'URLs', isArray: true }
    ]
  };

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
    setEditableData(prev => ({
      ...prev,
      [versionId]: {
        ...prev[versionId],
        [fieldId]: value
      }
    }));
  };

  // Handle array input changes (like phone numbers)
  const handleArrayInputChange = (versionId, fieldId, value) => {
    const arrayValue = value.split('\n').map(item => item.trim()).filter(Boolean);
    
    setEditableData(prev => ({
      ...prev,
      [versionId]: {
        ...prev[versionId],
        [fieldId]: arrayValue
      }
    }));
  };

  // Save all changes
  const handleSaveChanges = async () => {
    const updatePromises = Object.entries(editableData).map(async ([versionId, data]) => {
      const originalVersion = versions[imageId].find(v => v.id === parseInt(versionId));
      const changes = {};
      let hasChanges = false;

      // Find changes
      selectedFields.forEach(field => {
        if (JSON.stringify(originalVersion[field]) !== JSON.stringify(data[field])) {
          changes[field] = data[field];
          hasChanges = true;
        }
      });

      // Update version if there are changes
      if (hasChanges) {
        try {
          await updateVersionData(parseInt(versionId), changes);
        } catch (error) {
          console.error(`Failed to update version ${versionId}:`, error);
        }
      }
    });

    await Promise.all(updatePromises);
    setEditMode(false);
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
    if (versionData === undefined || versionData[fieldId] === undefined) {
      return '';
    }
    
    // Check if field is an array type
    const isArrayField = Array.isArray(versionData[fieldId]);
    
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
          value={versionData[fieldId] || ''}
          onChange={(e) => handleInputChange(versionId, fieldId, e.target.value)}
          className="w-full px-2 py-1 text-sm border border-border rounded"
        />
      );
    } else {
      // Display mode
      if (isArrayField) {
        return (versionData[fieldId] || []).map((item, idx) => (
          <div key={idx} className="mb-1">{item}</div>
        ));
      } else {
        return versionData[fieldId] || '';
      }
    }
  };

  // Show loading state while fetching versions
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show error state if there was an error
  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="p-4 mb-4 bg-error/10 border border-error text-error rounded-lg">
          <p>{error}</p>
        </div>
        <button 
          onClick={onClose}
          className="mt-2 px-4 py-2 bg-secondary text-white rounded hover:bg-secondary/90"
        >
          Close
        </button>
      </div>
    );
  }

  // Show empty state if no versions exist
  if (!imageVersions || imageVersions.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-text-muted">No versions available for this image.</p>
        <button 
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-secondary text-white rounded hover:bg-secondary/90"
        >
          Close
        </button>
      </div>
    );
  }

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