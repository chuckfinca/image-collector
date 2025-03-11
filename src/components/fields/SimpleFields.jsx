import React from 'react';
import { SocialProfilesField } from './SocialProfilesField';

// Simple text field that works in both views
export const TextField = ({ label, value, onChange, disabled }) => (
  <div className="space-y-1">
    <label className="block text-xs text-text-muted">{label}</label>
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-2 py-1 bg-background-alt border border-border rounded text-sm"
    />
  </div>
);

// Field for arrays (phone numbers, emails, etc.)
export const ArrayField = ({ label = "Item", values = [], onChange, disabled }) => {
    // Reference previous values to prevent unnecessary updates
    const valuesRef = React.useRef(values);
    
    // Only set state from props on initial render or when props genuinely change
    const [text, setText] = React.useState((values || []).join('\n'));
    
    // Handle local changes without triggering re-renders in parent
    const handleTextChange = (e) => {
      const newText = e.target.value;
      setText(newText);
      
      // Only update parent if not disabled
      if (!disabled) {
        const newArray = newText.split('\n').filter(item => item.trim());
        // Only call onChange if the array actually changed
        if (JSON.stringify(newArray) !== JSON.stringify(valuesRef.current)) {
          valuesRef.current = newArray;
          onChange(newArray);
        }
      }
    };
    
    // Update from props only when values actually change (and not on every render)
    React.useEffect(() => {
      if (JSON.stringify(values) !== JSON.stringify(valuesRef.current)) {
        valuesRef.current = values;
        setText((values || []).join('\n'));
      }
    }, [values]);
    
    return (
      <div className="space-y-1">
        {label && <label className="block text-xs text-text-muted">{label}</label>}
        <textarea
          value={text}
          onChange={handleTextChange}
          disabled={disabled}
          rows={3}
          placeholder="Enter one item per line"
          className="w-full px-2 py-1 bg-background-alt border border-border rounded text-sm"
        />
        <div className="text-xs text-text-muted">
          {values?.length || 0} items • Press Enter after each entry
        </div>
      </div>
    );
  };

// Simplified postal address component
export const AddressField = ({ addresses, onChange, disabled, label }) => {
    // Helper to update a specific address field
    const updateAddress = (index, field, value) => {
      const newAddresses = [...(addresses || [])];
      if (!newAddresses[index]) {
        newAddresses[index] = {};
      }
      newAddresses[index] = { ...newAddresses[index], [field]: value };
      onChange(newAddresses);
    };
  
    // Add a new empty address
    const addAddress = () => {
      onChange([...(addresses || []), { street: '', city: '', state: '', postal_code: '', country: '' }]);
    };
  
    // Remove an address
    const removeAddress = (index) => {
      const newAddresses = [...(addresses || [])];
      newAddresses.splice(index, 1);
      onChange(newAddresses);
    };
  
    return (
      <div className="space-y-2">
        <label className="block text-xs text-text-muted">{label || 'Addresses'}</label>
        
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {(addresses || []).map((address, index) => (
            <div key={index} className="p-2 border border-border rounded bg-background-alt/50">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <input
                    placeholder="Street"
                    value={address.street || ''}
                    onChange={(e) => updateAddress(index, 'street', e.target.value)}
                    disabled={disabled}
                    className="w-full px-2 py-1 text-sm border border-border rounded"
                  />
                </div>
                <input
                  placeholder="City"
                  value={address.city || ''}
                  onChange={(e) => updateAddress(index, 'city', e.target.value)}
                  disabled={disabled}
                  className="w-full px-2 py-1 text-sm border border-border rounded"
                />
                <input
                  placeholder="State/Province"
                  value={address.state || ''}
                  onChange={(e) => updateAddress(index, 'state', e.target.value)}
                  disabled={disabled}
                  className="w-full px-2 py-1 text-sm border border-border rounded"
                />
                <input
                  placeholder="Postal Code"
                  value={address.postal_code || ''}
                  onChange={(e) => updateAddress(index, 'postal_code', e.target.value)}
                  disabled={disabled}
                  className="w-full px-2 py-1 text-sm border border-border rounded"
                />
                <input
                  placeholder="Country"
                  value={address.country || ''}
                  onChange={(e) => updateAddress(index, 'country', e.target.value)}
                  disabled={disabled}
                  className="w-full px-2 py-1 text-sm border border-border rounded"
                />
              </div>
              
              {!disabled && (
                <button
                  onClick={() => removeAddress(index)}
                  className="mt-2 px-2 py-1 text-xs bg-error text-white rounded"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        
        {!disabled && (
          <button
            onClick={addAddress}
            className="w-full px-2 py-1 text-sm bg-background-alt text-text-muted rounded hover:bg-background-alt/80 border border-border"
          >
            + Add Address
          </button>
        )}
      </div>
    );
  };

// A reusable group of fields that can be used in both views
export const VersionFields = ({ data, onChange, disabled, fieldFilter }) => {
    // Define all the fields with their groups
    const allFields = {
      name: [
        { id: 'name_prefix', label: 'Prefix', type: 'text' },
        { id: 'given_name', label: 'Given Name', type: 'text' },
        { id: 'middle_name', label: 'Middle Name', type: 'text' },
        { id: 'family_name', label: 'Family Name', type: 'text' },
        { id: 'name_suffix', label: 'Suffix', type: 'text' },
      ],
      work: [
        { id: 'job_title', label: 'Job Title', type: 'text' },
        { id: 'department', label: 'Department', type: 'text' },
        { id: 'organization_name', label: 'Organization', type: 'text' },
      ],
      contact: [
        { id: 'phone_numbers', label: 'Phone Numbers', type: 'array' },
        { id: 'email_addresses', label: 'Email Addresses', type: 'array' },
        { id: 'url_addresses', label: 'URLs', type: 'array' },
        { id: 'social_profiles', label: 'Social Profiles', type: 'social' },
      ],
      address: [
        { id: 'postal_addresses', label: 'Postal Addresses', type: 'address' },
      ]
    };
    
    // Filter fields if specified
    const fieldsToRender = fieldFilter 
      ? Object.entries(allFields).flatMap(([_, fields]) => 
          fields.filter(field => fieldFilter.includes(field.id))
        )
      : Object.values(allFields).flat();
    
    // Handle changes for any field
    const handleFieldChange = (field, value) => {
      if (onChange) {
        onChange({ ...data, [field]: value });
      }
    };
    
    return (
      <div className="space-y-4">
        {fieldsToRender.map(field => (
          <div key={field.id}>
            {field.type === 'text' && (
              <TextField
                label={field.label}
                value={data?.[field.id]}
                onChange={(value) => handleFieldChange(field.id, value)}
                disabled={disabled}
              />
            )}
            
            {field.type === 'array' && (
              <ArrayField
                label={field.label}
                values={data?.[field.id]}
                onChange={(value) => handleFieldChange(field.id, value)}
                disabled={disabled}
              />
            )}
            
            {field.type === 'address' && (
              <AddressField
                label={field.label}
                addresses={data?.[field.id]}
                onChange={(value) => handleFieldChange(field.id, value)}
                disabled={disabled}
              />
            )}
            
            {field.type === 'social' && (
              <SocialProfilesField
                label={field.label}
                profiles={data?.[field.id] || []}
                onChange={(value) => handleFieldChange(field.id, value)}
                disabled={disabled}
              />
            )}
          </div>
        ))}
      </div>
    );
  };
  