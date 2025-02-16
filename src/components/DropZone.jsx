import React from 'react';

function DropZone({ isDragging, loading, onDragEnter, onDragOver, onDragLeave, onDrop }) {
  return (
    <div
      className={`dropzone relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
        isDragging 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
      }`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex flex-col items-center gap-3">
        <svg 
          width="40" 
          height="40" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={isDragging ? '#3B82F6' : '#9CA3AF'} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div>
          <p className="text-lg font-medium mb-1">
            {isDragging ? 'Drop images here' : 'Drag and drop images here'}
          </p>
          <p className="text-sm text-gray-500">
            Supported formats: PNG, JPG, JPEG, GIF
          </p>
        </div>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
          <div className="text-blue-500">Uploading...</div>
        </div>
      )}
    </div>
  );
}

export default DropZone;