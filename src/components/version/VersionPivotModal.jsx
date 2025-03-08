import React, { useEffect, useRef } from 'react';
import VersionPivotTable from './VersionPivotTable';

function VersionPivotModal({ imageId, onClose, isOpen }) {
  const modalRef = useRef(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-auto"
      >
        <VersionPivotTable imageId={imageId} onClose={onClose} />
      </div>
    </div>
  );
}

const getVersionFieldValue = (version, field) => {
    // Handle missing version or undefined field
    if (!version || version[field] === undefined || version[field] === null) {
      return '';
    }
    
    // Handle array fields
    if (Array.isArray(version[field])) {
      return version[field].join('\n'); // Or however you want to display arrays
    }
    
    // Return string values directly
    return version[field];
  };
  

export default VersionPivotModal;