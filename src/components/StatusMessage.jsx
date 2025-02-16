import React from 'react';

function StatusMessage({ message }) {
  if (!message) return null;
  
  return (
    <div className={`mt-4 p-3 rounded ${
      message.includes('error') || message.includes('failed')
        ? 'bg-red-50 text-red-700 border border-red-200'
        : 'bg-blue-50 text-blue-700 border border-blue-200'
    }`}>
      {message}
    </div>
  );
}

export default StatusMessage;