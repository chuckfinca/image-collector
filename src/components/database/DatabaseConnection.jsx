import React, { useState, useCallback, useEffect } from 'react';
import { useDb } from '../../context/DatabaseContext';
import { api } from '../../services/api';

function DatabaseConnection() {
  const { 
    dbPath, 
    setDbPath, 
    isConnected, 
    connect, 
    disconnect, 
    loading, 
    error, 
    totalImages 
  } = useDb();

  const handleConnect = useCallback(async (e) => {
    e.preventDefault();
    await connect();
  }, [connect]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
      <h2 className="text-xl font-bold text-gray-200 mb-4">Database Connection</h2>
      
      {isConnected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-green-400 text-sm flex items-center gap-2">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Connected
            </span>
            <span className="text-sm text-gray-400">{totalImages} images</span>
          </div>
          
          <div className="text-sm text-gray-300 truncate">
            Path: <span className="font-mono text-gray-400">{dbPath}</span>
          </div>
          
          <button
            onClick={disconnect}
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
          
          {error && (
            <div className="text-red-400 text-sm">
              {error}
            </div>
          )}
          
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