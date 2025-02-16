import React from 'react';

const DatabaseViewer = ({ images = [] }) => {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm h-[calc(100vh-2rem)] overflow-auto">
      <h2 className="text-lg font-semibold mb-4">Database Contents</h2>
      
      {images.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          No images in database
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div 
              key={index} 
              className="border rounded p-3 bg-gray-50"
            >
              <div className="aspect-video bg-gray-200 rounded mb-2 flex items-center justify-center">
                {/* Placeholder for image preview */}
                <svg 
                  className="w-8 h-8 text-gray-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                  />
                </svg>
              </div>
              <div className="text-sm truncate">{image.filename}</div>
              <div className="text-xs text-gray-500">
                Added: {new Date(image.date_added).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DatabaseViewer;