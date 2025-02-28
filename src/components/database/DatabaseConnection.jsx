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

  const refreshImages = useCallback(async () => {
    console.log(`Refreshing images. Connected: ${isConnected}, Path: ${dbPath}`);
    
    // Always try to refresh, even if we think we're not connected
    try {
      console.log("Fetching images from API...");
      const response = await api.fetchImages();
      console.log("API response:", response);
      
      if (!response) {
        console.error("No response from API");
        await tryReconnect();
        return;
      } 
      
      if (!response.images) {
        console.error("Response missing 'images' property:", response);
        await tryReconnect();
        return;
      } 
      
      if (!Array.isArray(response.images)) {
        console.error("Images is not an array:", response.images);
        await tryReconnect();
        return;
      }
      
      console.log(`Received ${response.images.length} images from API`);
      
      // Print details about each image
      response.images.forEach((img, index) => {
        console.log(`Image ${index}: ID=${img.id}, Has thumbnail: ${img.thumbnail ? 'Yes' : 'No'}`);
      });
      
      // Update state with the images we received
      setImages(response.images || []);
      
      // If we weren't connected before, we are now
      if (!isConnected) {
        setIsConnected(true);
        console.log("Auto-recovered connection state");
      }
      
      // Check status separately
      console.log("Fetching database status...");
      const statusResponse = await api.getStatus();
      console.log("Status response:", statusResponse);
      setTotalImages(statusResponse.total_images);
      
      // Log any mismatch
      console.log(`Mismatch: total_images=${statusResponse.total_images}, images.length=${response.images.length}`);
    } catch (error) {
      console.error("Error refreshing images:", error);
      handleError(error, 'refresh');
      
      // If we get an error, try to reconnect
      await tryReconnect();
    }
  }, [dbPath]);

  // Modified to only attempt reconnection when already in connected state
  const tryReconnect = useCallback(async () => {
    if (!dbPath || !isConnected) {
      console.log("Not attempting auto-reconnection - not in connected state or no path available");
      return;
    }
    
    try {
      console.log("Attempting to automatically reconnect to the database...");
      await api.initializeDatabase(dbPath);
      console.log("Auto-reconnection successful");
    } catch (error) {
      console.error("Auto-reconnection failed:", error);
    }
  }, [dbPath, isConnected]);

  // Modified to not automatically trigger reconnection on mount
  useEffect(() => {
    const savedPath = localStorage.getItem('imageDatabasePath');
    if (savedPath) {
      setDbPath(savedPath);
      console.log(`Retrieved saved database path: ${savedPath}`);
      // Don't automatically attempt reconnection here
    }
  }, [setDbPath]); // Removed tryReconnect from dependency array

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