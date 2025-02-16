import React from 'react';

function DatabaseConnection({ 
  dbPath, 
  setDbPath, 
  isConnected, 
  loading, 
  onConnect, 
  onDisconnect,
  totalImages 
}) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold mb-4">
        Image Collector {isConnected && `(${totalImages} images)`}
      </h1>
      
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="/path/to/database.db"
          value={dbPath}
          onChange={(e) => setDbPath(e.target.value)}
          disabled={isConnected}
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isConnected ? (
          <button
            onClick={onDisconnect}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

export default DatabaseConnection;