import { validateField, validateArray, validatePostalAddresses } from './validation';

/**
 * Prepares data for API submission by validating and sanitizing values
 * @param {Object} data - The data object to sanitize
 * @param {Array} selectedFields - Optional specific fields to process
 * @returns {Object} - Sanitized data object and validation results
 */
export const sanitizeContactData = (data, selectedFields = null) => {
  const sanitizedData = {};
  const validationResults = {};
  let isValid = true;

  // Ensure data is an object
  if (!data || typeof data !== 'object') {
    console.error("Invalid data provided:", data);
    return { sanitizedData: {}, validationResults: {}, isValid: false };
  }

  // Determine which fields to process
  const processFields = selectedFields || [
    // Name fields
    'name_prefix', 'given_name', 'middle_name', 'family_name', 'name_suffix',
    // Work fields
    'job_title', 'department', 'organization_name',
    // Contact fields
    'phone_numbers', 'email_addresses', 'url_addresses', 'postal_addresses',
    // Extra fields - version specific
    'tag', 'notes', 'is_active'
  ];

  // Process each field that exists in the data
  processFields.forEach(field => {
    try {
      // Skip if field doesn't exist in data
      if (!(field in data)) return;

      const value = data[field];

      // Handle arrays based on field type
      if (Array.isArray(value)) {
        switch (field) {
          case 'phone_numbers':
            validationResults[field] = validateArray(value, 'phone');
            if (validationResults[field]) {
              sanitizedData[field] = value
                .filter(item => item !== null && item !== undefined)
                .map(item => typeof item === 'string' ? item.trim() : String(item));
            }
            break;

          case 'email_addresses':
            validationResults[field] = validateArray(value, 'email');
            if (validationResults[field]) {
              sanitizedData[field] = value
                .filter(item => item !== null && item !== undefined)
                .map(item => typeof item === 'string' ? item.trim() : String(item));
            }
            break;

          case 'url_addresses':
            validationResults[field] = validateArray(value, 'url');
            if (validationResults[field]) {
              sanitizedData[field] = value
                .filter(item => item !== null && item !== undefined)
                .map(item => typeof item === 'string' ? item.trim() : String(item));
            }
            break;

          case 'postal_addresses':
            // For postal addresses, use the specialized validator
            validationResults[field] = validatePostalAddresses(value);
            
            if (validationResults[field]) {
              // Filter and sanitize addresses
              const sanitizedAddresses = [];
              
              value.forEach(addr => {
                // Skip null/undefined or non-objects
                if (!addr || typeof addr !== 'object') return;
                
                // Create a clean address object
                const cleanAddr = {};
                let hasContent = false;
                
                // Process each field of the address
                Object.entries(addr).forEach(([key, val]) => {
                  // Skip control fields
                  if (['id', 'version_id', 'image_id'].includes(key)) return;
                  
                  // Skip undefined/null values
                  if (val === null || val === undefined) return;
                  
                  // Sanitize string values
                  if (typeof val === 'string') {
                    const trimmed = val.trim();
                    if (trimmed) {
                      cleanAddr[key] = trimmed;
                      hasContent = true;
                    }
                  } else if (typeof val === 'number') {
                    cleanAddr[key] = String(val);
                    hasContent = true;
                  } else {
                    // Skip other types
                    console.warn(`Unexpected type for address field ${key}:`, typeof val);
                  }
                });
                
                // Only add addresses with actual content
                if (hasContent) {
                  sanitizedAddresses.push(cleanAddr);
                }
              });
              
              // Always include the field, even if empty array
              sanitizedData[field] = sanitizedAddresses;
            } else {
              console.error(`Invalid postal addresses:`, value);
            }
            break;

          default:
            // For any other array fields
            validationResults[field] = true;
            sanitizedData[field] = value.filter(item => item !== null && item !== undefined);
        }
      } 
      // Handle simple string/value fields
      else {
        switch (field) {
          // Fields that should be strings
          case 'name_prefix':
          case 'given_name':
          case 'middle_name':
          case 'family_name':
          case 'name_suffix':
          case 'job_title':
          case 'department':
          case 'organization_name':
          case 'tag':
          case 'notes':
            validationResults[field] = true; // Simple string fields are always valid after trimming
            if (value !== null && value !== undefined) {
              // Convert to string and trim
              sanitizedData[field] = String(value).trim();
            }
            break;
          
          // Boolean fields
          case 'is_active':
            validationResults[field] = true;
            sanitizedData[field] = Boolean(value);
            break;
          
          default:
            // Default handling for other fields
            validationResults[field] = true;
            if (value !== null && value !== undefined) {
              sanitizedData[field] = value;
            }
        }
      }

      // Update overall validation status
      if (validationResults[field] === false) {
        isValid = false;
        console.error(`Validation failed for field ${field}`);
      }
    } catch (error) {
      console.error(`Error processing field ${field}:`, error);
      validationResults[field] = false;
      isValid = false;
    }
  });

  return {
    sanitizedData,
    validationResults,
    isValid
  };
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