import React, { useState } from 'react';
import { useDb } from '../context/DatabaseContext';
import DatabaseConnection from './database/DatabaseConnection';
import UploadControls from './upload/UploadControls';

function TopNavbar() {
  const { isConnected } = useDb();
  const [statusMessage, setStatusMessage] = useState('');
  
  return (
    <div className="bg-background-alt p-2 border-b border-border shadow-sm">
        <div className="container mx-auto flex items-center">
            {/* App title */}
            <h1 className="text-base font-bold text-text mr-4 flex items-center">Contact Collector</h1>
            
            {/* Database Connection */}
            <DatabaseConnection onStatusChange={setStatusMessage} />
            
            {/* Spacer */}
            <div className="flex-grow"></div>
            
            {/* Status Message */}
            {statusMessage && (
            <div className="text-sm mx-2 px-3 py-1.5 bg-background-subtle rounded text-text-muted border border-border-subtle">
                {statusMessage}
            </div>
            )}
            
            {/* Upload Controls */}
            {isConnected && (
            <UploadControls onStatusChange={setStatusMessage} />
            )}
        </div>
        </div>
  );
}

export default TopNavbar;