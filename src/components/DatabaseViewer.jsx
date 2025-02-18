import React from 'react';

function DatabaseViewer({ images }) {
  if (!images || images.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No images in database
      </div>
    );
  }

  // Helper function to display empty values
  const displayValue = (value, placeholder = '—') => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400">{placeholder}</span>;
    }
    return value;
  };

  return (
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
          {images.map((image, index) => (
            <tr key={image.id || index} className="hover:bg-gray-50">
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
                  <div className="text-xs font-mono text-gray-500">
                    Hash: {displayValue(image.hash?.slice(0, 8))}
                  </div>
                </div>
              </td>

              {/* Name Information */}
              <td className="p-4 align-top">
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="font-medium text-gray-700">Prefix</div>
                    <div>{displayValue(image.name_prefix)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Given Name</div>
                    <div>{displayValue(image.given_name)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Middle Name</div>
                    <div>{displayValue(image.middle_name)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Family Name</div>
                    <div>{displayValue(image.family_name)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Suffix</div>
                    <div>{displayValue(image.name_suffix)}</div>
                  </div>
                </div>
              </td>

              {/* Work Information */}
              <td className="p-4 align-top">
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="font-medium text-gray-700">Job Title</div>
                    <div>{displayValue(image.job_title)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Department</div>
                    <div>{displayValue(image.department)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Organization</div>
                    <div>{displayValue(image.organization_name)}</div>
                  </div>
                </div>
              </td>

              {/* Contact Information */}
              <td className="p-4 align-top">
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Phone Numbers</div>
                    {image.phone_numbers?.length > 0 ? (
                      image.phone_numbers.map((phone, idx) => (
                        <div key={idx}>{phone}</div>
                      ))
                    ) : displayValue(null)}
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Email Addresses</div>
                    {image.email_addresses?.length > 0 ? (
                      image.email_addresses.map((email, idx) => (
                        <div key={idx}>{email}</div>
                      ))
                    ) : displayValue(null)}
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Postal Addresses</div>
                    {image.postal_addresses?.length > 0 ? (
                      image.postal_addresses.map((addr, idx) => (
                        <div key={idx} className="mb-2">
                          {[
                            addr.street,
                            addr.sub_locality,
                            addr.city,
                            addr.state,
                            addr.postal_code,
                            addr.country
                          ].filter(Boolean).join(', ') || '—'}
                        </div>
                      ))
                    ) : displayValue(null)}
                  </div>
                </div>
              </td>

              {/* Online Presence */}
              <td className="p-4 align-top">
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-700 mb-1">URLs</div>
                    {image.url_addresses?.length > 0 ? (
                      image.url_addresses.map((url, idx) => (
                        <div key={idx}>
                          <a href={url} target="_blank" rel="noopener noreferrer" 
                             className="text-blue-500 hover:text-blue-600">
                            {new URL(url).hostname}
                          </a>
                        </div>
                      ))
                    ) : displayValue(null)}
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Social Profiles</div>
                    {image.social_profiles?.length > 0 ? (
                      image.social_profiles.map((profile, idx) => (
                        <div key={idx}>
                          {profile.url ? (
                            <a href={profile.url} target="_blank" rel="noopener noreferrer"
                               className="text-blue-500 hover:text-blue-600">
                              {profile.service}: {profile.username}
                            </a>
                          ) : (
                            <span>{profile.service}: {profile.username}</span>
                          )}
                        </div>
                      ))
                    ) : displayValue(null)}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DatabaseViewer;