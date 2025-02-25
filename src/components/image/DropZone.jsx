import React from 'react';

const DropZone = ({ isDragging, loading, onDragEnter, onDragOver, onDragLeave, onDrop }) => {
  return (
    <div
      className={`dropzone relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
        isDragging 
          ? 'border-blue-500 bg-blue-50/10' 
          : loading
            ? 'border-gray-400 bg-gray-50/5 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/5'
      }`}
      onDragEnter={!loading ? onDragEnter : undefined}
      onDragOver={!loading ? onDragOver : undefined}
      onDragLeave={!loading ? onDragLeave : undefined}
      onDrop={!loading ? onDrop : undefined}
    >
      <div className="flex flex-col items-center gap-3">
        {loading ? (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        ) : (
          <>
            <svg 
              width="40" height="40" viewBox="0 0 24 24" 
              fill="none" stroke={isDragging ? '#3B82F6' : '#9CA3AF'} 
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm text-gray-500">Drop images here</p>
          </>
        )}
      </div>
    </div>
  );
};

export default DropZone;