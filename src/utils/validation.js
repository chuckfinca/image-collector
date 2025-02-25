export const validateField = (value, type) => {
    if (!value) return true;
    
    const validators = {
      email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      url: (val) => /^https?:\/\/[^\s]+$/.test(val),
      phone: (val) => /^\+?[\d\s-()]+$/.test(val),
      default: () => true
    };
  
    return validators[type] ? validators[type](value) : validators.default();
  };
  
  export const validateArray = (values, type) => {
    if (!values?.length) return true;
    return values.every(value => !value.trim() || validateField(value.trim(), type));
  };
  
  export const getValidationMessage = (field) => {
    const messages = {
      email_addresses: 'One or more invalid email addresses',
      url_addresses: 'One or more invalid URLs',
      phone_numbers: 'One or more invalid phone numbers',
      default: 'Invalid input'
    };
    
    return messages[field] || messages.default;
  };