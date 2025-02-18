import React, { useState } from 'react';

function DatabaseViewer({ images, onUpdateImage }) {
  const [editMode, setEditMode] = useState(false);
  const [editingData, setEditingData] = useState({});

  if (!images || images.length === 0) {
    return (
      <div className="text-gray-400 text-center py-8">
        No images in database
      </div>
    );
  }

  const handleEditToggle = () => {
    if (editMode) {
      // Save all pending changes when exiting edit mode
      Object.entries(editingData).forEach(([imageId, data]) => {
        // Simple validation - remove empty entries from arrays
        const cleanData = {
          ...data,
          email_addresses: data.email_addresses?.filter(email => email.trim()) || [],
          phone_numbers: data.phone_numbers?.filter(phone => phone.trim()) || [],
          url_addresses: data.url_addresses?.filter(url => url.trim()) || []
        };
        onUpdateImage(parseInt(imageId), cleanData);
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

  // Simple EditableField component
  const EditableField = ({ imageId, field, value }) => {
    const currentValue = editingData[imageId]?.[field] ?? value;
    
    if (!editMode) {
      return <div className="text-gray-300">{currentValue || "—"}</div>;
    }

    return (
      <input
        type="text"
        value={currentValue || ""}
        onChange={(e) => handleFieldChange(imageId, field, e.target.value)}
        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
      />
    );
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
          {editMode ? 'Save Changes' : 'Edit Mode'}
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-700 rounded-lg shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              <th className="p-4 text-left font-medium text-gray-200">Image</th>
              <th className="p-4 text-left font-medium text-gray-200">Name Info</th>
              <th className="p-4 text-left font-medium text-gray-200">Work Info</th>
              <th className="p-4 text-left font-medium text-gray-200">Contact Info</th>
              <th className="p-4 text-left font-medium text-gray-200">Online Presence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {images.map((image) => (
              <tr key={image.id} className="hover:bg-gray-800/50">
                {/* Image Column */}
                <td className="p-4 align-top">
                  <div className="space-y-2">
                    <div className="w-32 h-32 relative bg-gray-800 rounded flex items-center justify-center">
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
                    <div className="text-xs text-gray-400">
                      Added: {new Date(image.date_added).toLocaleString()}
                    </div>
                  </div>
                </td>

                {/* Name Information */}
                <td className="p-4 align-top">
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="font-medium text-gray-300">Name</div>
                      <EditableField imageId={image.id} field="given_name" value={image.given_name} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-300">Family Name</div>
                      <EditableField imageId={image.id} field="family_name" value={image.family_name} />
                    </div>
                  </div>
                </td>

                {/* Work Information */}
                <td className="p-4 align-top">
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="font-medium text-gray-300">Job Title</div>
                      <EditableField imageId={image.id} field="job_title" value={image.job_title} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-300">Organization</div>
                      <EditableField imageId={image.id} field="organization_name" value={image.organization_name} />
                    </div>
                  </div>
                </td>

                {/* Contact Information */}
                <td className="p-4 align-top">
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-300 mb-1">Phone Numbers</div>
                      {editMode ? (
                        <textarea
                          value={(image.phone_numbers || []).join('\n')}
                          onChange={(e) => handleFieldChange(image.id, 'phone_numbers', e.target.value.split('\n'))}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
                          rows={3}
                        />
                      ) : (
                        image.phone_numbers?.map((phone, idx) => (
                          <div key={idx} className="text-gray-300">{phone}</div>
                        )) || <div className="text-gray-500">—</div>
                      )}
                    </div>
                    
                    <div>
                      <div className="font-medium text-gray-300 mb-1">Email Addresses</div>
                      {editMode ? (
                        <textarea
                          value={(image.email_addresses || []).join('\n')}
                          onChange={(e) => handleFieldChange(image.id, 'email_addresses', e.target.value.split('\n'))}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
                          rows={3}
                        />
                      ) : (
                        image.email_addresses?.map((email, idx) => (
                          <div key={idx} className="text-gray-300">{email}</div>
                        )) || <div className="text-gray-500">—</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Online Presence */}
                <td className="p-4 align-top">
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-300 mb-1">URLs</div>
                      {editMode ? (
                        <textarea
                          value={(image.url_addresses || []).join('\n')}
                          onChange={(e) => handleFieldChange(image.id, 'url_addresses', e.target.value.split('\n'))}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
                          rows={3}
                        />
                      ) : (
                        image.url_addresses?.map((url, idx) => (
                          <div key={idx}>
                            <a href={url} target="_blank" rel="noopener noreferrer" 
                               className="text-blue-400 hover:text-blue-300">
                              {url}
                            </a>
                          </div>
                        )) || <div className="text-gray-500">—</div>
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