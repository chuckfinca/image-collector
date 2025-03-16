import React, { useEffect, useRef } from 'react';

function ImageViewModal({ imageId, onClose }) {
  const windowRef = useRef(null);
  
  useEffect(() => {
    if (imageId) {
      // Close previous window if one exists
      if (windowRef.current) {
        windowRef.current.close();
      }
      
      // Build the URL to the original image
      const imageUrl = `/api/original/${imageId}`;
      
      // Create a simple HTML document to display the image
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Image Viewer</title>
            <style>
              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                background-color: #242424;
                color-scheme: dark light;
              }
              
              @media (prefers-color-scheme: light) {
                html, body {
                  background-color: #ffffff;
                }
              }
              
              img {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="Original Image" />
          </body>
        </html>
      `;
      
      // Calculate window size based on screen
      const width = Math.min(1200, window.screen.availWidth * 0.8);
      const height = Math.min(800, window.screen.availHeight * 0.8);
      const left = (window.screen.availWidth - width) / 2;
      const top = (window.screen.availHeight - height) / 2;
      
      // Open the window
      windowRef.current = window.open(
        '',
        'imageViewer',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes`
      );
      
      if (windowRef.current) {
        windowRef.current.document.write(htmlContent);
        windowRef.current.document.close();
        
        // Handle window being closed
        windowRef.current.onbeforeunload = () => {
          onClose();
        };
      }
    }
    
    // Cleanup function
    return () => {
      if (windowRef.current && !imageId) {
        windowRef.current.close();
        windowRef.current = null;
      }
    };
  }, [imageId, onClose]);
  
  // This component doesn't render anything
  return null;
}

export default ImageViewModal;