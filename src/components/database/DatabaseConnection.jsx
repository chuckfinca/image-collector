import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDb } from '../../context/DatabaseContext';

function DatabaseConnection({ compact = false, onStatusChange = () => {} }) {
  const { 
    dbPath, 
    setDbPath, 
    isConnected, 
    connect, 
    disconnect, 
    loading
  } = useDb();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleConnect = useCallback(async (e) => {
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
      setShowDropdown(false);
    } catch (error) {
      onStatusChange(`Connection error: ${error.message}`);
    }
  }, [connect, dbPath, onStatusChange]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    onStatusChange('Disconnected from database');
    setTimeout(() => onStatusChange(''), 3000);
  }, [disconnect, onStatusChange]);

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Retrieve saved path on mount
  useEffect(() => {
    const savedPath = localStorage.getItem('imageDatabasePath');
    if (savedPath) {
      setDbPath(savedPath);
    }
  }, [setDbPath]);

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`px-4 py-1.5 rounded text-sm font-medium ${
            isConnected 
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isConnected ? 'Database' : 'Connect DB'}
        </button>
        
        {showDropdown && (
          <div className="absolute left-0 mt-2 w-64 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
            {isConnected ? (
              <div className="p-4 space-y-4">
                <div className="flex flex-col space-y-1">
                  <span className="text-xs text-gray-400">Current database:</span>
                  <span className="text-sm text-gray-300 break-all font-mono">{dbPath}</span>
                </div>
                
                <button
                  onClick={handleDisconnect}
                  className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <form onSubmit={handleConnect} className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs text-gray-300">
                    Database Path
                  </label>
                  <input
                    type="text"
                    value={dbPath}
                    onChange={(e) => setDbPath(e.target.value)}
                    placeholder="Enter database path..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !dbPath.trim()}
                  className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Connecting...
                    </span>
                  ) : 'Connect'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    );
  }

  // Original full-size version for non-compact mode
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
      <h2 className="text-xl font-bold text-gray-200 mb-4">Database Connection</h2>
      
      {isConnected ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-300 truncate">
            Path: <span className="font-mono text-gray-400">{dbPath}</span>
          </div>
          
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm text-gray-300">
              Database Path
            </label>
            <input
              type="text"
              value={dbPath}
              onChange={(e) => setDbPath(e.target.value)}
              placeholder="Enter database path (e.g., ~/images.db)"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !dbPath.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                Connecting...
              </span>
            ) : 'Connect'}
          </button>
        </form>
      )}
    </div>
  );
}

export default DatabaseConnection;