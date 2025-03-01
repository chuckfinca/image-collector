import React, { useEffect } from 'react';
import { useDb } from '../../context/DatabaseContext';

function DatabaseConnection({ onStatusChange = () => {} }) {
  const { 
    dbPath, 
    setDbPath, 
    isConnected, 
    connect, 
    disconnect, 
    loading
  } = useDb();
  
  const handleConnect = async (e) => {
    e.preventDefault();
    if (!dbPath.trim()) {
      onStatusChange('Please enter a database path');
      return;
    }
    
    try {
      onStatusChange('Connecting...');
      await connect();
      onStatusChange('Connected successfully');
      setTimeout(() => onStatusChange(''), 3000);
    } catch (error) {
      onStatusChange(`Connection error: ${error.message}`);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    onStatusChange('Disconnected from database');
    setTimeout(() => onStatusChange(''), 3000);
  };

  // Retrieve saved path on mount
  useEffect(() => {
    const savedPath = localStorage.getItem('imageDatabasePath');
    if (savedPath) {
      setDbPath(savedPath);
    }
  }, [setDbPath]);

  return (
    <div className="flex items-center">
      {isConnected ? (
        <button
          onClick={handleDisconnect}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors relative group"
        >
          <span>Disconnect</span>
          {/* Path tooltip on hover */}
          <div className="absolute left-0 top-full mt-1 bg-gray-800 text-xs text-gray-300 p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
            from <span className="font-mono">{dbPath}</span>
          </div>
        </button>
      ) : (
        <form onSubmit={handleConnect} className="flex items-center">
          <input
            type="text"
            value={dbPath}
            onChange={(e) => setDbPath(e.target.value)}
            placeholder="Database path..."
            className="w-48 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-l text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !dbPath.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-r text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="flex items-center">
                <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-1" />
                <span>Connecting...</span>
              </span>
            ) : 'Connect'}
          </button>
        </form>
      )}
    </div>
  );
}

export default DatabaseConnection;