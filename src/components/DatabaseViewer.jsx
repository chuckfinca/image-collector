import React from 'react';

function DatabaseViewer({ images }) {
  if (!images || images.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No images in database
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg shadow-sm">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-4 text-left font-medium text-gray-500">Thumbnail</th>
            <th className="p-4 text-left font-medium text-gray-500">Filename</th>
            <th className="p-4 text-left font-medium text-gray-500">Date Added</th>
            <th className="p-4 text-left font-medium text-gray-500">Source URL</th>
            <th className="p-4 text-left font-medium text-gray-500">Hash</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {images.map((image, index) => (
            <tr key={image.id || index} className="hover:bg-gray-50">
              <td className="p-4">
                <div className="w-24 h-24 relative bg-gray-100 rounded flex items-center justify-center">
                  {image.thumbnail ? (
                    <img
                      src={image.thumbnail}
                      alt={image.filename}
                      className="object-contain w-full h-full rounded"
                    />
                  ) : (
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
                  )}
                </div>
              </td>
              <td className="p-4 text-sm">
                <span className="font-medium">{image.filename}</span>
              </td>
              <td className="p-4 text-sm text-gray-500">
                {image.date_added ? new Date(image.date_added).toLocaleString() : 'Unknown date'}
              </td>
              <td className="p-4 text-sm text-gray-500">
                {image.source_url ? (
                  <a 
                    href={image.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    {new URL(image.source_url).hostname}
                  </a>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="p-4 text-sm font-mono text-gray-500">
                {image.hash ? `${image.hash.slice(0, 8)}...` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DatabaseViewer;