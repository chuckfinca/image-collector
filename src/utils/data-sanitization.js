/**
 * Sanitizes contact data for API submission
 * @param {Object} data - The data object to sanitize
 * @returns {Object} - Sanitized data object
 */
export const sanitizeContactData = (data) => {
    if (!data || typeof data !== 'object') return {};
    
    const result = {};
    
    // Process each field in the data object
    Object.entries(data).forEach(([key, value]) => {
      // Handle arrays (email_addresses, phone_numbers, etc.)
      if (Array.isArray(value)) {
        // Filter out empty/null/undefined values and trim strings
        const cleanArray = value
          .filter(item => item !== null && item !== undefined)
          .map(item => typeof item === 'string' ? item.trim() : item)
          .filter(item => item !== '');
          
        // For email addresses, do basic validation
        result[key] = cleanArray;
      }
      // Handle postal_addresses array specially
      else if (key === 'postal_addresses' && Array.isArray(value)) {
        // Filter out empty address objects
        result[key] = value
          .filter(addr => addr && typeof addr === 'object')
          .map(addr => {
            // Clean each address field
            const cleanAddr = {};
            Object.entries(addr).forEach(([addrKey, addrVal]) => {
              // Skip control fields and empty values
              if (['id', 'version_id', 'image_id'].includes(addrKey)) return;
              if (addrVal === null || addrVal === undefined) return;
              
              // Trim string values
              if (typeof addrVal === 'string') {
                const trimmed = addrVal.trim();
                if (trimmed) cleanAddr[addrKey] = trimmed;
              } else {
                cleanAddr[addrKey] = addrVal;
              }
            });
            
            // Only return address if it has at least one non-empty field
            return Object.keys(cleanAddr).length > 0 ? cleanAddr : null;
          })
          .filter(Boolean); // Remove null results
      }
      // Handle social_profiles array specially
      else if (key === 'social_profiles' && Array.isArray(value)) {
        // Filter out completely empty profile objects
        result[key] = value
          .filter(profile => profile && typeof profile === 'object')
          .map(profile => {
            // Clean each profile field
            const cleanProfile = {};
            Object.entries(profile).forEach(([profileKey, profileVal]) => {
              // Skip control fields and empty values
              if (['id', 'version_id', 'image_id'].includes(profileKey)) return;
              if (profileVal === null || profileVal === undefined) return;
              
              // Trim string values
              if (typeof profileVal === 'string') {
                const trimmed = profileVal.trim();
                if (trimmed) cleanProfile[profileKey] = trimmed;
              } else {
                cleanProfile[profileKey] = profileVal;
              }
            });
            
            // Include all profiles that have at least one non-empty field
            return Object.keys(cleanProfile).length > 0 ? cleanProfile : null;
          })
          .filter(Boolean); // Remove null results
      }
      // Handle simple string values
      else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== '') {
          result[key] = trimmed;
        }
      }
      // Pass through other values (booleans, numbers, etc.)
      else if (value !== null && value !== undefined) {
        result[key] = value;
      }
    });
    
    return result;
  };
  
  /**
   * Detects changes between original data and updated data
   * @param {Object} originalData - The original data object
   * @param {Object} updatedData - The updated data object
   * @param {Array} fields - Fields to check for changes
   * @returns {Object} - Object containing only the changed fields
   */
  export const detectChanges = (originalData, updatedData, fields) => {
    const changes = {};
    let hasChanges = false;
  
    // Ensure both objects exist
    if (!originalData || !updatedData) {
      console.error("Invalid objects for change detection:", { originalData, updatedData });
      return { changes: {}, hasChanges: false };
    }
  
    fields.forEach(field => {
      try {
        // Skip if field isn't in updated data
        if (!(field in updatedData)) return;
        
        const newValue = updatedData[field];
        const originalValue = originalData[field];
        
        // Handle arrays and objects with special comparison
        if (Array.isArray(newValue) || (newValue && typeof newValue === 'object')) {
          // Special handling for postal_addresses to prevent unnecessary updates
          if (field === 'postal_addresses') {
            // Both null/undefined - no change
            if (!originalValue && !newValue) return;
            
            // One is array, one is not - change detected
            if (!Array.isArray(originalValue) !== !Array.isArray(newValue)) {
              changes[field] = newValue;
              hasChanges = true;
              return;
            }
            
            // Different lengths - change detected
            if ((originalValue?.length || 0) !== (newValue?.length || 0)) {
              changes[field] = newValue;
              hasChanges = true;
              return;
            }
            
            // Deep compare each address
            if (Array.isArray(originalValue) && Array.isArray(newValue)) {
              const addressesChanged = newValue.some((addr, idx) => {
                const origAddr = originalValue[idx] || {};
                // Compare relevant fields, ignoring control fields
                const relevantFields = ['street', 'city', 'state', 'postal_code', 'country', 'sub_locality', 'sub_administrative_area', 'iso_country_code'];
                return relevantFields.some(addrField => addr[addrField] !== origAddr[addrField]);
              });
              
              if (addressesChanged) {
                changes[field] = newValue;
                hasChanges = true;
              }
            }
          } else {
            // For other arrays and objects, use JSON comparison
            if (JSON.stringify(originalValue) !== JSON.stringify(newValue)) {
              changes[field] = newValue;
              hasChanges = true;
            }
          }
        }
        // Simple value comparison for primitives
        else if (originalValue !== newValue) {
          changes[field] = newValue;
          hasChanges = true;
        }
      } catch (error) {
        console.error(`Error comparing field ${field}:`, error);
      }
    });
  
    return {
      changes,
      hasChanges
    };
  };