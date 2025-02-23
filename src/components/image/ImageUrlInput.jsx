import React from 'react';

const ImageUrlInput = ({ url, setUrl, loading, onSubmit }) => {
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="url"
        placeholder="Image URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
        className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
          </span>
        ) : 'Add URL'}
      </button>
    </form>
  );
};

export default ImageUrlInput;