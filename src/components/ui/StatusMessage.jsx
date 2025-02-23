import React from 'react';

const StatusMessage = ({ message }) => {
  if (!message) return null;
  
  const isError = message.toLowerCase().includes('error') || 
                 message.toLowerCase().includes('failed');
  
  return (
    <div className={`mt-4 p-3 rounded ${
      isError
        ? 'bg-red-50 text-red-700 border border-red-200'
        : 'bg-blue-50 text-blue-700 border border-blue-200'
    }`}>
      {message}
    </div>
  );
};

export default StatusMessage;