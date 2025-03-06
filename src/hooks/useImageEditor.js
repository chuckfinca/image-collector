import { useState, useCallback, useEffect } from 'react';
import { validateField, validateArray } from '../utils/validation';

// IMPORTANT: We're now passing displayImages (already overlaid with version data) rather than raw images
export const useImageEditor = (displayImages, updateImage, updateVersionData, activeVersions) => {
  const [editMode, setEditMode] = useState(false);
  const [editableImages, setEditableImages] = useState([]);
  const [validationState, setValidationState] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize editable images when entering edit mode using the displayImages
  // which already have version data overlaid
  useEffect(() => {
    if (editMode) {
      // Deep clone to avoid modifying the source
      const imagesForEdit = JSON.parse(JSON.stringify(displayImages));
      
      // Store special properties needed for edit tracking
      imagesForEdit.forEach(img => {
        // We need to track if this is a version overlay for saving
        if (img._displayedVersionId) {
          img._isVersionOverlay = true;
          img._versionId = img._displayedVersionId;
        }
      });
      
      setEditableImages(imagesForEdit);
    }
  }, [editMode, displayImages]);

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
        // Find the corresponding displayed image to compare with
        const originalImage = displayImages.find(img => img.id === image.id);
        const changes = {};
        let hasFieldChanges = false;

        // Check each field for changes
        const fields = [
          'name_prefix', 'given_name', 'middle_name', 'family_name', 'name_suffix',
          'job_title', 'department', 'organization_name',
          'phone_numbers', 'email_addresses', 'url_addresses', 'postal_addresses'
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
            // Use the _isVersionOverlay flag to determine where to save
            if (image._isVersionOverlay && image._versionId) {
              console.log(`Updating version ${image._versionId} for image ${image.id}`);
              await updateVersionData(image._versionId, changes);
            } else {
              console.log(`Updating base image ${image.id}`);
              await updateImage(image.id, changes);
            }
          } catch (error) {
            console.error(`Failed to update for ${image.id}:`, error);
          }
        }
      });

      await Promise.all(updatePromises);
    }

    // Toggle edit mode
    setEditMode(!editMode);
    setHasChanges(false);
  }, [editMode, editableImages, displayImages, hasChanges, validateFields, updateImage, updateVersionData]);

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