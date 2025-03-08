export const validateField = (value, type) => {
  // Null/undefined/empty values are considered valid
  if (value === null || value === undefined || value === '') return true;
  
  const validators = {
    email: (val) => {
      try {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim());
      } catch (e) {
        console.error("Email validation error:", e);
        return false;
      }
    },
    url: (val) => {
      try {
        return /^https?:\/\/[^\s]+$/.test(String(val).trim());
      } catch (e) {
        console.error("URL validation error:", e);
        return false;
      }
    },
    phone: (val) => {
      try {
        return /^\+?[\d\s-()]+$/.test(String(val).trim());
      } catch (e) {
        console.error("Phone validation error:", e);
        return false;
      }
    },
    default: () => true
  };

  // Check if we have a validator for this type
  const validator = validators[type] || validators.default;
  
  try {
    return validator(value);
  } catch (e) {
    console.error(`Validation error for type ${type}:`, e);
    return false;
  }
};

export const validateArray = (values, type) => {
  // No values or empty array is valid
  if (!values || !Array.isArray(values) || values.length === 0) return true;
  
  try {
    // Check each value in the array
    return values.every(value => {
      // Skip empty values
      if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
        return true;
      }
      return validateField(value, type);
    });
  } catch (e) {
    console.error(`Array validation error for type ${type}:`, e);
    return false;
  }
};

// New function to validate address objects
export const validateAddress = (address) => {
  // Empty address is valid
  if (!address || typeof address !== 'object') return true;
  
  // Check if address has any content
  const hasContent = Object.entries(address).some(([key, val]) => {
    // Skip control fields
    if (['id', 'version_id', 'image_id'].includes(key)) return false;
    
    // Check if the field has a value
    return val !== null && val !== undefined && val !== '';
  });
  
  // If it has content, all fields should be valid
  if (hasContent) {
    // All address fields are optional strings, so just check they're not invalid
    return Object.entries(address).every(([key, val]) => {
      // Skip control fields
      if (['id', 'version_id', 'image_id'].includes(key)) return true;
      
      // Skip undefined/null/empty values
      if (val === null || val === undefined || val === '') return true;
      
      // Validate as a simple string
      return typeof val === 'string' || typeof val === 'number';
    });
  }
  
  return true;
};

// New function to validate postal address arrays
export const validatePostalAddresses = (addresses) => {
  // Empty array is valid
  if (!addresses || !Array.isArray(addresses) || addresses.length === 0) return true;
  
  try {
    // Check each address in the array
    return addresses.every(address => validateAddress(address));
  } catch (e) {
    console.error("Postal addresses validation error:", e);
    return false;
  }
};

export const getValidationMessage = (field) => {
  const messages = {
    email_addresses: 'One or more invalid email addresses',
    url_addresses: 'One or more invalid URLs',
    phone_numbers: 'One or more invalid phone numbers',
    postal_addresses: 'One or more invalid postal addresses',
    default: 'Invalid input'
  };
  
  return messages[field] || messages.default;
};