import React, { useState } from 'react';

function DatabaseViewer({ images, onUpdateImage }) {
  const [editMode, setEditMode] = useState(false);
  const [editingData, setEditingData] = useState({});

  if (!images || images.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No images in database
      </div>
    );
  }

  const handleEditToggle = () => {
    if (editMode) {
      // Save all pending changes when exiting edit mode
      Object.entries(editingData).forEach(([imageId, data]) => {
        onUpdateImage(parseInt(imageId), data);
      });
      setEditingData({});
    }
    setEditMode(!editMode);
  };

  const handleFieldChange = (imageId, field, value) => {
    setEditingData(prev => ({
      ...prev,
      [imageId]: {
        ...(prev[imageId] || {}),
        [field]: value
      }
    }));
  };

  const getEditableValue = (imageId, field, currentValue) => {
    return editingData[imageId]?.[field] ?? currentValue;
  };

  // Helper function to create editable field
  const EditableField = ({ imageId, field, value, type = "text" }) => {
    const currentValue = getEditableValue(imageId, field, value);
    
    return editMode ? (
      <input
        type={type}
        value={currentValue || ""}
        onChange={(e) => handleFieldChange(imageId, field, e.target.value)}
        className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    ) : (
      <div>{currentValue || "—"}</div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Database Contents</h2>
        <button
          onClick={handleEditToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
            editMode 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {editMode ? (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Save Changes
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              Edit Mode
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="p-4 text-left font-medium text-gray-500 bg-gray-50">Image</th>
              <th className="p-4 text-left font-medium text-gray-500 bg-gray-50">Name Info</th>
              <th className="p-4 text-left font-medium text-gray-500 bg-gray-50">Work Info</th>
              <th className="p-4 text-left font-medium text-gray-500 bg-gray-50">Contact Info</th>
              <th className="p-4 text-left font-medium text-gray-500 bg-gray-50">Online Presence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {images.map((image) => (
              <tr key={image.id} className="hover:bg-gray-50">
                {/* Image Column */}
                <td className="p-4 align-top">
                  <div className="space-y-2">
                    <div className="w-32 h-32 relative bg-gray-100 rounded flex items-center justify-center">
                      {image.thumbnail ? (
                        <img
                          src={image.thumbnail}
                          alt="Business card"
                          className="object-contain w-full h-full rounded"
                        />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Added: {new Date(image.date_added).toLocaleString()}
                    </div>
                  </div>
                </td>

                {/* Name Information */}
                <td className="p-4 align-top">
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">Prefix</div>
                      <EditableField imageId={image.id} field="name_prefix" value={image.name_prefix} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Given Name</div>
                      <EditableField imageId={image.id} field="given_name" value={image.given_name} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Middle Name</div>
                      <EditableField imageId={image.id} field="middle_name" value={image.middle_name} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Family Name</div>
                      <EditableField imageId={image.id} field="family_name" value={image.family_name} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Suffix</div>
                      <EditableField imageId={image.id} field="name_suffix" value={image.name_suffix} />
                    </div>
                  </div>
                </td>

                {/* Work Information */}
                <td className="p-4 align-top">
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">Job Title</div>
                      <EditableField imageId={image.id} field="job_title" value={image.job_title} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Department</div>
                      <EditableField imageId={image.id} field="department" value={image.department} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Organization</div>
                      <EditableField imageId={image.id} field="organization_name" value={image.organization_name} />
                    </div>
                  </div>
                </td>

                {/* Contact Information */}
                <td className="p-4 align-top">
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700 mb-1">Phone Numbers</div>
                      {editMode ? (
                        <textarea
                          value={getEditableValue(image.id, 'phone_numbers', (image.phone_numbers || []).join('\n'))}
                          onChange={(e) => handleFieldChange(image.id, 'phone_numbers', e.target.value.split('\n'))}
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      ) : (
                        image.phone_numbers?.length > 0 
                          ? image.phone_numbers.map((phone, idx) => (
                              <div key={idx}>{phone}</div>
                            ))
                          : <div className="text-gray-400">—</div>
                      )}
                    </div>
                    
                    <div>
                      <div className="font-medium text-gray-700 mb-1">Email Addresses</div>
                      {editMode ? (
                        <textarea
                          value={getEditableValue(image.id, 'email_addresses', (image.email_addresses || []).join('\n'))}
                          onChange={(e) => handleFieldChange(image.id, 'email_addresses', e.target.value.split('\n'))}
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      ) : (
                        image.email_addresses?.length > 0
                          ? image.email_addresses.map((email, idx) => (
                              <div key={idx}>{email}</div>
                            ))
                          : <div className="text-gray-400">—</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Online Presence */}
                <td className="p-4 align-top">
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700 mb-1">URLs</div>
                      {editMode ? (
                        <textarea
                          value={getEditableValue(image.id, 'url_addresses', (image.url_addresses || []).join('\n'))}
                          onChange={(e) => handleFieldChange(image.id, 'url_addresses', e.target.value.split('\n'))}
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      ) : (
                        image.url_addresses?.length > 0
                          ? image.url_addresses.map((url, idx) => (
                              <div key={idx}>
                                <a href={url} target="_blank" rel="noopener noreferrer" 
                                   className="text-blue-500 hover:text-blue-600">
                                  {new URL(url).hostname}
                                </a>
                              </div>
                            ))
                          : <div className="text-gray-400">—</div>
                      )}
                    </div>
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