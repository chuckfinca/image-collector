import React, { useState, useEffect } from 'react';
import { useDb } from '../../context/DatabaseContext';
import { TextField, ArrayField, AddressField } from '../fields/SimpleFields';
import useVersionManagement from '../../hooks/useVersionManagement';
import { SocialProfilesField } from '../fields/SocialProfilesField';

function VersionPivotTable({ imageId, onClose }) {
  const { fetchVersions, updateVersion } = useDb();
  
  // State for table editing functionality
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [selectedFields, setSelectedFields] = useState([
    'given_name', 'family_name', 'organization_name', 
    'phone_numbers', 'email_addresses', 'postal_addresses',
    'social_profiles'
  ]);
  
  // Add state for showing metadata
  const [showMetadata, setShowMetadata] = useState(true);
  
  // Use the shared version management hook
  const {
    newVersionTag,
    setNewVersionTag,
    notes,
    setNotes,
    createBlank, 
    setCreateBlank,
    imageVersions,
    handleCreateVersion,
    handleDeleteVersion
  } = useVersionManagement(imageId);
  
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
      { id: 'url_addresses', label: 'URLs', isArray: true },
      { id: 'social_profiles', label: 'Social Profiles', isComplex: true }
    ],
    'Address Information': [
      { id: 'postal_addresses', label: 'Postal Addresses', isComplex: true }
    ],
    'Extraction Metadata': [
      { id: 'model_id', label: 'Model ID', isMetadata: true },
      { id: 'program_name', label: 'Extractor Program', isMetadata: true },
      { id: 'program_version', label: 'Extractor Version', isMetadata: true },
      { id: 'extracted_at', label: 'Extraction Date', isMetadata: true }
    ]
  };
  
  // Initialize edit data when entering edit mode
  useEffect(() => {
    if (editMode && imageVersions.length > 0) {
      const initialData = {};
      imageVersions.forEach(version => {
        initialData[version.id] = { ...version };
      });
      setEditData(initialData);
    }
  }, [editMode, imageVersions]);
  
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
    console.log(`Field change in VersionPivotTable: ${field}`, value);
    
    setEditData(prev => {
      // Make a deep copy of previous state
      const newData = { ...prev };
      
      // Ensure this version exists in the edit data
      if (!newData[versionId]) {
        newData[versionId] = {};
      }
      
      // Handle special cases for complex data types
      if (field === 'social_profiles') {
        // Ensure we're creating a new array reference
        newData[versionId] = {
          ...newData[versionId],
          [field]: [...value]  // Create a proper copy of the array
        };
      } else {
        // For other fields, just update normally
        newData[versionId] = {
          ...newData[versionId],
          [field]: value
        };
      }
      
      return newData;
    });
  };
  
  // Handle saving changes
  const handleSaveChanges = async () => {
    // Save each version's changes
    for (const [versionId, data] of Object.entries(editData)) {
      try {
        console.log(`Preparing to save version ${versionId} with data:`, data);
        await updateVersion(parseInt(versionId), data);
        console.log(`Successfully saved version ${versionId}`);
      } catch (error) {
        console.error(`Failed to update version ${versionId}:`, error);
      }
    }
    
    // Exit edit mode
    setEditMode(false);
  };
  
  // Create a new version with a simple wrapper
  const createNewVersion = async () => {
    if (!newVersionTag.trim()) {
      alert("Please enter a name for the new version");
      return;
    }
    
    try {
      await handleCreateVersion({
        tag: newVersionTag,
        notes: notes,
        createBlank: createBlank,
        sourceVersionId: !createBlank && imageVersions.length > 0 ? imageVersions[0].id : null
      });
      
      // Reset form fields
      setNewVersionTag('');
      setNotes('');
      setCreateBlank(false);
    } catch (error) {
      alert(`Failed to create version: ${error.message}`);
    }
  };
  
  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
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
    
    // Handle metadata fields differently
    if (fieldDef.isMetadata) {
      if (field === 'extracted_at') {
        return <div>{formatDate(effectiveData[field])}</div>;
      }
      return <div>{effectiveData[field] || '-'}</div>;
    }
    
    // Handle field based on its type
    if (field === 'postal_addresses') {
      return (
        <AddressField 
          addresses={effectiveData[field] || []}
          onChange={(value) => handleFieldChange(version.id, field, value)}
          disabled={!isEditing}
        />
      );
    } else if (field === 'social_profiles') {
      // Properly handle social profiles with the correct component
      return (
        <SocialProfilesField 
          profiles={effectiveData[field] || []}
          onChange={(value) => handleFieldChange(version.id, field, value)}
          disabled={!isEditing}
        />
      );
    } else if (fieldDef.isArray) {
      return (
        <ArrayField 
          values={effectiveData[field] || []}
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

  // Filter selected fields based on metadata toggle
  const filteredFields = selectedFields.filter(field => {
    const fieldDef = Object.values(fieldGroups).flat().find(f => f.id === field);
    return showMetadata || !(fieldDef && fieldDef.isMetadata);
  });

  return (
    <div className="p-4">
      {/* Header with action buttons */}
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
      <div className="mb-4 p-3 border border-border rounded bg-background-alt">
        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newVersionTag}
              onChange={(e) => setNewVersionTag(e.target.value)}
              placeholder="New version name"
              className="flex-1 px-3 py-2 bg-background border border-border rounded"
            />
            <button
              onClick={createNewVersion}
              disabled={!newVersionTag.trim()}
              className="px-4 py-2 bg-secondary text-white rounded disabled:opacity-50"
            >
              Create Version
            </button>
          </div>
          
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Version notes (optional)"
            className="w-full px-3 py-2 bg-background border border-border rounded"
          />
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="create-blank-pivot"
              checked={createBlank}
              onChange={() => setCreateBlank(!createBlank)}
              className="mr-2"
            />
            <label htmlFor="create-blank-pivot" className="text-sm">
              Start with empty version (don't copy current data)
            </label>
          </div>
        </div>
      </div>
      
      {/* Field Selector and Metadata Toggle */}
      <div className="mb-4 p-4 border border-border rounded bg-background-alt">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium">Select Fields to Compare:</h3>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="show-metadata"
              checked={showMetadata}
              onChange={() => setShowMetadata(!showMetadata)}
              className="mr-2"
            />
            <label htmlFor="show-metadata" className="text-sm">
              Show AI Metadata
            </label>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(fieldGroups).map(([groupName, fields]) => {
            // Skip metadata section if toggle is off
            if (!showMetadata && groupName === 'Extraction Metadata') {
              return null;
            }
            
            return (
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
            );
          })}
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
                      {/* Show AI model badge if available */}
                      {version.model_id && (
                        <div className="mt-1 text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full inline-block">
                          {version.model_id}
                        </div>
                      )}
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
            {filteredFields.map(fieldId => {
              // Find field label
              let fieldLabel = '';
              let isMetadata = false;
              Object.values(fieldGroups).forEach(group => {
                const field = group.find(f => f.id === fieldId);
                if (field) {
                  fieldLabel = field.label;
                  isMetadata = !!field.isMetadata;
                }
              });
              
              return (
                <tr key={fieldId} className={`hover:bg-background-alt/50 ${isMetadata ? 'bg-primary/5' : ''}`}>
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