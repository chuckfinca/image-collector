import { useState, useCallback, useEffect } from 'react';
import { validateField, validateArray } from '../utils/validation';

export const useImageEditor = (images, updateImage) => {
  const [editMode, setEditMode] = useState(false);
  const [editableImages, setEditableImages] = useState([]);
  const [validationState, setValidationState] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Reset editable images when source images change
  useEffect(() => {
    if (editMode) {
      setEditableImages(JSON.parse(JSON.stringify(images)));
    }
  }, [images, editMode]);

  const validateFields = useCallback((imageId, fields) => {
    const newValidationState = { ...validationState };
    let isValid = true;

    Object.entries(fields).forEach(([field, value]) => {
      if (field.includes('_addresses')) {
        // Handle array fields
        const validationType = field.replace('_addresses', '');
        const arrayValue = Array.isArray(value) ? value : value.split('\n');
        const fieldValid = validateArray(arrayValue, validationType);
        newValidationState[imageId] = {
          ...(newValidationState[imageId] || {}),
          [field]: fieldValid
        };
        isValid = isValid && fieldValid;
      } else {
        // Handle single value fields
        const fieldValid = validateField(value, field);
        newValidationState[imageId] = {
          ...(newValidationState[imageId] || {}),
          [field]: fieldValid
        };
        isValid = isValid && fieldValid;
      }
    });

    setValidationState(newValidationState);
    return isValid;
  }, [validationState]);

  const handleEditToggle = useCallback(async () => {
    if (editMode && hasChanges) {
      // Save changes
      const updatePromises = editableImages.map(async (image) => {
        const originalImage = images.find(img => img.id === image.id);
        const changes = {};
        let hasFieldChanges = false;

        // Check each field for changes
        const fields = [
          'name_prefix', 'given_name', 'middle_name', 'family_name', 'name_suffix',
          'job_title', 'department', 'organization_name',
          'phone_numbers', 'email_addresses', 'url_addresses'
        ];

        fields.forEach(field => {
          const oldValue = originalImage[field];
          const newValue = image[field];
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes[field] = newValue;
            hasFieldChanges = true;
          }
        });

        // Only update if there are actual changes
        if (hasFieldChanges && validateFields(image.id, changes)) {
          try {
            await updateImage(image.id, changes);
          } catch (error) {
            console.error(`Failed to update image ${image.id}:`, error);
          }
        }
      });

      await Promise.all(updatePromises);
    } else {
      // Enter edit mode
      setEditableImages(JSON.parse(JSON.stringify(images)));
      setValidationState({});
    }

    setEditMode(!editMode);
    setHasChanges(false);
  }, [editMode, editableImages, images, hasChanges, validateFields, updateImage]);

  const handleInputChange = useCallback((imageId, field, value) => {
    setEditableImages(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { ...img, [field]: value }
          : img
      )
    );
    setHasChanges(true);
    validateFields(imageId, { [field]: value });
  }, [validateFields]);

  const handleArrayInputChange = useCallback((imageId, field, value, validationType) => {
    const arrayValue = value.split('\n').map(item => item.trim()).filter(Boolean);
    
    setEditableImages(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { ...img, [field]: arrayValue }
          : img
      )
    );
    
    setHasChanges(true);
    validateFields(imageId, { [field]: arrayValue });
  }, [validateFields]);

  return {
    editMode,
    editableImages,
    validationState,
    hasChanges,
    handleEditToggle,
    handleInputChange,
    handleArrayInputChange
  };
};