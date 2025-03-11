/**
 * Sanitizes contact data for API submission
 * @param {Object} data - The data object to sanitize
 * @returns {Object} - Sanitized data object
 */
export const sanitizeContactData = (data) => {
    // Create a deep copy to avoid modifying the original
    // Using JSON parse/stringify to ensure proper cloning of nested structures
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Handle array fields with proper initialization
    sanitized.phone_numbers = Array.isArray(sanitized.phone_numbers) ? sanitized.phone_numbers : [];
    sanitized.email_addresses = Array.isArray(sanitized.email_addresses) ? sanitized.email_addresses : [];
    sanitized.url_addresses = Array.isArray(sanitized.url_addresses) ? sanitized.url_addresses : [];
    
    // Handle postal addresses
    sanitized.postal_addresses = Array.isArray(sanitized.postal_addresses) ? sanitized.postal_addresses : [];
    
    // Handle social profiles specifically - ensuring they're properly structured
    if (sanitized.social_profiles) {
      if (!Array.isArray(sanitized.social_profiles)) {
        console.warn('Social profiles is not an array, setting to empty array');
        sanitized.social_profiles = [];
      } else {
        // Filter out invalid profiles and ensure required fields
        sanitized.social_profiles = sanitized.social_profiles
          .filter(profile => profile && typeof profile === 'object')
          .map(profile => ({
            service: profile.service || '',
            url: profile.url || '',
            username: profile.username || ''
          }));
        
        console.log('Social profiles after proper sanitization:', 
          JSON.stringify(sanitized.social_profiles));
      }
    } else {
      // Initialize as empty array if not present
      sanitized.social_profiles = [];
    }
    
    return sanitized;
  };
  
  // Helper function to validate field values
  export const validateField = (value, field) => {
    if (!value) return true; // Empty values are considered valid
    
    switch (field) {
      case 'email_addresses':
        return Array.isArray(value) && value.every(email => 
          typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      case 'phone_numbers':
        return Array.isArray(value) && value.every(phone => 
          typeof phone === 'string');
      case 'url_addresses':
        return Array.isArray(value) && value.every(url => 
          typeof url === 'string');
      case 'postal_addresses':
        return Array.isArray(value);
      case 'social_profiles':
        return Array.isArray(value) && value.every(profile => 
          typeof profile === 'object' && 
          'service' in profile && 
          'username' in profile);
      default:
        return true;
    }
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
        console.log(`Comparing field ${field}:`, originalValue, newValue);
        
        // Special handling for postal_addresses 
        if (field === 'postal_addresses') {
            // Handle postal addresses (existing code)
            // ... (existing code for postal_addresses)
        } 
        // Add special handling for social_profiles
        else if (field === 'social_profiles') {
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
            
            // Deep compare each profile
            if (Array.isArray(originalValue) && Array.isArray(newValue)) {
            console.log("Comparing social profile arrays:", originalValue, newValue);
            
            const profilesChanged = newValue.some((profile, idx) => {
                const origProfile = originalValue[idx] || {};
                // Compare all relevant fields
                const relevantFields = ['service', 'username', 'url'];
                return relevantFields.some(profileField => profile[profileField] !== origProfile[profileField]);
            });
            
            if (profilesChanged) {
                console.log("Social profiles changed, including in changes object");
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