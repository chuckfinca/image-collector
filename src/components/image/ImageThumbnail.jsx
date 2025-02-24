import React from 'react';
import { useDb } from '../../context/DatabaseContext';

function ImageThumbnail({ 
  image, 
  onSetSelectedImageUrl, 
  editMode 
}) {
  const { 
    extractContactInfo, 
    deleteImage, 
    operationStatus 
  } = useDb();

  // Get extraction status for this image
  const extracting = operationStatus[`extract-${image.id}`]?.loading;
  const extractError = operationStatus[`extract-${image.id}`]?.error;

  const handleImageClick = () => {
    // Just pass the thumbnail for preview
    // The modal component can handle displaying it
    onSetSelectedImageUrl(image.thumbnail);
  };

  const handleExtract = async () => {
    try {
      await extractContactInfo(image.id);
    } catch (error) {
      // Error is already handled in context
      console.log('Extraction failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteImage(image.id);
    } catch (error) {
      // Error is already handled in context
      console.log('Delete failed:', error);
    }
  };

  return (
    <div className="space-y-2">
      <div className="w-32 h-32 bg-gray-800 rounded flex items-center justify-center">
    {image.thumbnail ? (
        <img
        src={image.thumbnail}
        alt="Business card"
        className="object-contain w-full h-full rounded cursor-pointer"
        onDoubleClick={handleImageClick}
        />
    ) : (
        <div className="text-gray-500 flex flex-col items-center justify-center w-full h-full">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M20 15l-5-5L5 20" />
        </svg>
        <span className="text-xs mt-1">No thumbnail</span>
        </div>
    )}
    </div>
      
      <div className="text-xs text-gray-400">
        Added: {new Date(image.date_added).toLocaleString()}
      </div>
      
      {extractError && (
        <div className="text-xs text-red-500">
          {extractError}
        </div>
      )}
      
      <button
        onClick={handleExtract}
        disabled={extracting || !editMode}
        className={`w-full px-2 py-1 text-sm rounded transition-colors ${
          extracting 
            ? 'bg-purple-400 cursor-not-allowed' 
            : 'bg-purple-500 hover:bg-purple-600'
        } text-white disabled:opacity-50`}
      >
        {extracting ? 'Extracting...' : 'Extract Contact Info'}
      </button>
      
      <button
        onClick={handleDelete}
        disabled={extracting}
        className="w-full px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
      >
        Delete Entry
      </button>
    </div>
  );
}

export default ImageThumbnail;