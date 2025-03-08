import React, { useState, useEffect } from 'react';
import { useDb } from '../../context/DatabaseContext';
import { TextField, ArrayField, AddressField } from '../fields/SimpleFields';

function VersionPivotTable({ imageId, onClose }) {
  const { versions, fetchVersions, updateVersion, deleteVersion, createVersion } = useDb();
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [selectedFields, setSelectedFields] = useState([
    'given_name', 'family_name', 'organization_name', 
    'phone_numbers', 'email_addresses', 'postal_addresses'
  ]);
  const [newVersionName, setNewVersionName] = useState('');
  
  // Define all field groups
  const fieldGroups = {
    'Name Information': [
      { id: 'name_prefix', label: 'Prefix' },
      { id: 'given_name', label: 'Given Name' },
      { id: 'middle_name', label: 'Middle Name' },
      { id: 'family_name', label: 'Family Name' },
      { id: 'name_suffix', label: 'Suffix' }
    ],
    'Work Information': [
      { id: 'job_title', label: 'Job Title' },
      { id: 'department', label: 'Department' },
      { id: 'organization_name', label: 'Organization' }
    ],
    'Contact Information': [
      { id: 'phone_numbers', label: 'Phone Numbers', isArray: true },
      { id: 'email_addresses', label: 'Email Addresses', isArray: true },
      { id: 'url_addresses', label: 'URLs', isArray: true }
    ],
    'Address Information': [
      { id: 'postal_addresses', label: 'Postal Addresses', isComplex: true }
    ]
  };
  
  // Fetch versions if needed
  useEffect(() => {
    const loadVersions = async () => {
      if (!versions[imageId]) {
        await fetchVersions(imageId);
      }
    };
    
    loadVersions();
  }, [imageId, versions, fetchVersions]);
  
  // Initialize edit data when entering edit mode
  useEffect(() => {
    if (editMode && versions[imageId]) {
      const initialData = {};
      versions[imageId].forEach(version => {
        initialData[version.id] = { ...version };
      });
      setEditData(initialData);
    }
  }, [editMode, versions, imageId]);
  
  // Get all versions for this image
  const imageVersions = versions[imageId] || [];
  
  // Toggle a field in the selected fields list
  const toggleField = (fieldId) => {
    setSelectedFields(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };
  
  // Handle field changes in edit mode
  const handleFieldChange = (versionId, field, value) => {
    setEditData(prev => ({
      ...prev,
      [versionId]: {
        ...prev[versionId],
        [field]: value
      }
    }));
  };
  
  // Handle saving changes
  const handleSaveChanges = async () => {
    // Save each version's changes
    for (const [versionId, data] of Object.entries(editData)) {
      try {
        await updateVersion(parseInt(versionId), data);
      } catch (error) {
        console.error(`Failed to update version ${versionId}:`, error);
      }
    }
    
    // Refresh versions
    await fetchVersions(imageId);
    
    // Exit edit mode
    setEditMode(false);
  };
  
  // Handle delete version
  const handleDeleteVersion = async (versionId) => {
    // Prevent deleting the only version
    if (imageVersions.length <= 1) {
      alert("Cannot delete the only version");
      return;
    }
    
    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this version?")) {
      return;
    }
    
    try {
      await deleteVersion(versionId);
    } catch (error) {
      console.error("Failed to delete version:", error);
    }
  };
  
  // Create a new version
  const handleCreateVersion = async () => {
    if (!newVersionName.trim()) {
      alert("Please enter a name for the new version");
      return;
    }
    
    try {
      // Use the first version as source
      const sourceVersionId = imageVersions.length > 0 ? imageVersions[0].id : null;
      
      await createVersion(
        imageId,
        newVersionName,
        sourceVersionId,
        "Created from version comparison"
      );
      
      // Reset input and refresh
      setNewVersionName('');
      await fetchVersions(imageId);
      
    } catch (error) {
      console.error("Failed to create version:", error);
      alert(`Failed to create version: ${error.message}`);
    }
  };
  
  // Render field value based on its type
  const renderFieldValue = (version, field, isEditing = false) => {
    // Get effective data (either from edit state or version object)
    const effectiveData = isEditing ? editData[version.id] || {} : version;
    const fieldDef = Object.values(fieldGroups)
      .flat()
      .find(f => f.id === field);
    
    if (!fieldDef) return null;
    
    if (field === 'postal_addresses') {
      return (
        <AddressField 
          addresses={effectiveData[field]}
          onChange={(value) => handleFieldChange(version.id, field, value)}
          disabled={!isEditing}
        />
      );
    } else if (fieldDef.isArray) {
      return (
        <ArrayField 
          values={effectiveData[field]}
          onChange={(value) => handleFieldChange(version.id, field, value)}
          disabled={!isEditing}
        />
      );
    } else {
      return (
        <TextField 
          value={effectiveData[field]}
          onChange={(value) => handleFieldChange(version.id, field, value)}
          disabled={!isEditing}
        />
      );
    }
  };
  
  // Loading state
  if (!imageVersions.length) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Version Comparison</h2>
          <button onClick={onClose} className="px-4 py-2 bg-background-alt text-text rounded">Close</button>
        </div>
        <div className="text-center py-8 text-text-muted">Loading versions...</div>
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
                className="px-4 py-2 bg-success text-white rounded"
              >
                Save Changes
              </button>
              <button 
                onClick={() => setEditMode(false)}
                className="px-4 py-2 bg-error text-white rounded"
              >
                Cancel
              </button>
            </>
          ) : (
            <button 
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-primary text-white rounded"
            >
              Edit All
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-background-alt text-text rounded border border-border"
          >
            Close
          </button>
        </div>
      </div>
      
      {/* New version creation */}
      <div className="mb-4 p-3 border border-border rounded bg-background-alt flex">
        <input
          type="text"
          value={newVersionName}
          onChange={(e) => setNewVersionName(e.target.value)}
          placeholder="New version name"
          className="flex-1 px-3 py-2 bg-background border border-border rounded-l"
        />
        <button
          onClick={handleCreateVersion}
          disabled={!newVersionName.trim()}
          className="px-4 py-2 bg-secondary text-white rounded-r disabled:opacity-50"
        >
          Create Version
        </button>
      </div>
      
      {/* Field Selector */}
      <div className="mb-4 p-4 border border-border rounded bg-background-alt">
        <h3 className="text-sm font-medium mb-2">Select Fields to Compare:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <div className="flex justify-between items-center">
                    <div>
                      <div>{version.tag}</div>
                      <div className="text-xs text-text-muted">
                        {new Date(version.created_at).toLocaleString()}
                      </div>
                    </div>
                    {!editMode && imageVersions.length > 1 && (
                      <button
                        onClick={() => handleDeleteVersion(version.id)}
                        className="ml-2 p-1 text-error hover:bg-background-alt/90 rounded"
                        title="Delete Version"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Render a row for each selected field */}
            {selectedFields.map(fieldId => {
              // Find field label
              let fieldLabel = '';
              Object.values(fieldGroups).forEach(group => {
                const field = group.find(f => f.id === fieldId);
                if (field) fieldLabel = field.label;
              });
              
              return (
                <tr key={fieldId} className="hover:bg-background-alt/50">
                  <td className="p-3 font-medium border-r border-b border-border">
                    {fieldLabel}
                  </td>
                  {imageVersions.map(version => (
                    <td key={version.id} className="p-3 border-r border-b border-border">
                      {renderFieldValue(version, fieldId, editMode)}
                    </td>
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