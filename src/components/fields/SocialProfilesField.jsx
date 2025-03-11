import React, { useState } from 'react';
// Note: This component should be added to SimpleFields.jsx

// Common social platforms with their icons and colors
const SOCIAL_PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', icon: '🔗' },
  { id: 'twitter', name: 'Twitter/X', color: '#1DA1F2', icon: '🐦' },
  { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: '👤' },
  { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: '📷' },
  { id: 'github', name: 'GitHub', color: '#333333', icon: '💻' },
  { id: 'youtube', name: 'YouTube', color: '#FF0000', icon: '▶️' },
  { id: 'other', name: 'Other', color: '#777777', icon: '🔗' },
];

export const SocialProfilesField = ({ profiles = [], onChange, disabled, label }) => {
  // State for new profile form visibility
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProfile, setNewProfile] = useState({ 
    service: SOCIAL_PLATFORMS[0].id, 
    serviceName: SOCIAL_PLATFORMS[0].name,
    username: '', 
    url: '' 
  });

  // Add a new profile
  const addProfile = () => {
    // If service is "other" but no custom name provided, set a default
    const serviceName = newProfile.service === 'other' && !newProfile.serviceName.trim() 
      ? 'Other' 
      : newProfile.serviceName;
    
    // Create the new profile object
    const profile = {
      service: newProfile.service === 'other' ? serviceName : newProfile.service,
      username: newProfile.username.trim(),
      url: newProfile.url.trim()
    };
    
    // Add to the list of profiles
    onChange([...profiles, profile]);
    
    // Reset the form
    setNewProfile({ 
      service: SOCIAL_PLATFORMS[0].id, 
      serviceName: SOCIAL_PLATFORMS[0].name,
      username: '', 
      url: '' 
    });
    setShowAddForm(false);
  };

  // Remove a profile
  const removeProfile = (index) => {
    const newProfiles = [...profiles];
    newProfiles.splice(index, 1);
    onChange(newProfiles);
  };

  // Update a profile
  const updateProfile = (index, field, value) => {
    const newProfiles = [...profiles];
    newProfiles[index] = { ...newProfiles[index], [field]: value };
    onChange(newProfiles);
  };

  // Get platform details by service ID
  const getPlatformDetails = (serviceId) => {
    const platform = SOCIAL_PLATFORMS.find(p => p.id === serviceId) || SOCIAL_PLATFORMS.find(p => p.id === 'other');
    return platform;
  };

  // Get platform icon by service name
  const getServiceIcon = (serviceName) => {
    // Find by ID first
    let platform = SOCIAL_PLATFORMS.find(p => p.id === serviceName.toLowerCase());
    
    // If not found, try matching by name
    if (!platform) {
      platform = SOCIAL_PLATFORMS.find(p => 
        p.name.toLowerCase() === serviceName.toLowerCase()
      );
    }
    
    // Fallback to "other" if no match found
    return platform ? platform.icon : '🔗';
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs text-text-muted">{label || 'Social Profiles'}</label>
      
      {/* List of existing profiles */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {profiles.length === 0 && !showAddForm && (
          <div className="text-xs text-text-muted italic">
            No social profiles added
          </div>
        )}
        
        {profiles.map((profile, index) => (
          <div key={index} className="flex items-center space-x-2 p-2 border border-border rounded bg-background-alt/50">
            <div className="flex-shrink-0 w-6 text-center">
              {getServiceIcon(profile.service)}
            </div>
            
            {disabled ? (
              // Display mode
              <div className="flex-grow">
                <div className="font-medium text-sm">{profile.username}</div>
                <div className="text-xs text-text-muted">{profile.service}</div>
                {profile.url && (
                  <a 
                    href={profile.url.startsWith('http') ? profile.url : `https://${profile.url}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate block"
                  >
                    {profile.url}
                  </a>
                )}
              </div>
            ) : (
              // Edit mode
              <div className="flex-grow grid grid-cols-3 gap-2">
                <select
                  value={profile.service}
                  onChange={(e) => updateProfile(index, 'service', e.target.value)}
                  disabled={disabled}
                  className="col-span-1 px-2 py-1 text-sm border border-border rounded"
                >
                  {SOCIAL_PLATFORMS.map(platform => (
                    <option key={platform.id} value={platform.id}>{platform.name}</option>
                  ))}
                </select>
                <input
                  placeholder="Username"
                  value={profile.username}
                  onChange={(e) => updateProfile(index, 'username', e.target.value)}
                  disabled={disabled}
                  className="col-span-2 px-2 py-1 text-sm border border-border rounded"
                />
                <input
                  placeholder="URL"
                  value={profile.url}
                  onChange={(e) => updateProfile(index, 'url', e.target.value)}
                  disabled={disabled}
                  className="col-span-3 px-2 py-1 text-sm border border-border rounded"
                />
              </div>
            )}
            
            {!disabled && (
              <button
                onClick={() => removeProfile(index)}
                className="flex-shrink-0 p-1 text-error hover:bg-error/10 rounded"
                title="Remove social profile"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      
      {/* Add profile form */}
      {showAddForm && !disabled && (
        <div className="p-2 border border-border rounded bg-background-alt/50">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <select
              value={newProfile.service}
              onChange={(e) => {
                const platform = getPlatformDetails(e.target.value);
                setNewProfile({ 
                  ...newProfile, 
                  service: e.target.value,
                  serviceName: platform.name 
                });
              }}
              className="col-span-1 px-2 py-1 text-sm border border-border rounded"
            >
              {SOCIAL_PLATFORMS.map(platform => (
                <option key={platform.id} value={platform.id}>{platform.name}</option>
              ))}
            </select>
            
            {newProfile.service === 'other' && (
              <input
                placeholder="Service Name"
                value={newProfile.serviceName}
                onChange={(e) => setNewProfile({...newProfile, serviceName: e.target.value})}
                className="col-span-2 px-2 py-1 text-sm border border-border rounded"
              />
            )}
            
            <input
              placeholder="Username"
              value={newProfile.username}
              onChange={(e) => setNewProfile({...newProfile, username: e.target.value})}
              className={`${newProfile.service === 'other' ? 'col-span-3' : 'col-span-2'} px-2 py-1 text-sm border border-border rounded`}
            />
            
            <input
              placeholder="URL (optional)"
              value={newProfile.url}
              onChange={(e) => setNewProfile({...newProfile, url: e.target.value})}
              className="col-span-3 px-2 py-1 text-sm border border-border rounded"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={addProfile}
              className="px-2 py-1 text-xs bg-success text-white rounded"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-2 py-1 text-xs bg-background-alt text-text-muted rounded hover:bg-background-alt/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Add button */}
      {!showAddForm && !disabled && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full px-2 py-1 text-sm bg-background-alt text-text-muted rounded hover:bg-background-alt/80 border border-border"
        >
          + Add Social Profile
        </button>
      )}
    </div>
  );
};