import React, { useState } from 'react';
import { useDb } from '../context/DatabaseContext';
import DatabaseConnection from './database/DatabaseConnection';
import UploadControls from './upload/UploadControls';

function TopNavbar() {
  const { isConnected } = useDb();
  const [statusMessage, setStatusMessage] = useState('');
  
  return (
    <div className="bg-gray-800 p-2 border-b border-gray-700">
      <div className="container mx-auto flex items-center">
        {/* App title */}
        <h1 className="text-base font-bold text-white mr-4">Contact Collector</h1>
        
        {/* Database Connection */}
        <DatabaseConnection 
          compact={true} 
          onStatusChange={setStatusMessage}
        />
        
        {/* Spacer */}
        <div className="flex-grow"></div>
        
        {/* Status Message */}
        {statusMessage && (
          <div className="text-sm mx-2 px-2 py-1 bg-gray-700 rounded text-gray-200">
            {statusMessage}
          </div>
        )}
        
        {/* Upload Controls - only visible when connected */}
        {isConnected && (
          <UploadControls onStatusChange={setStatusMessage} />
        )}
      </div>
    </div>
  );
}

export default TopNavbar;