import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

function ImageViewModal({ imageId, onClose }) {
  const [imageUrl, setImageUrl] = useState(null);
  const windowRef = useRef(null);
  
  useEffect(() => {
    const loadImage = async () => {
      if (imageId) {
        try {
          // Fetch the image data as base64
          const response = await api.getFullImage(imageId);
          
          if (response && response.image_data) {
            // Create a data URL from the base64 data
            const dataUrl = `data:image/jpeg;base64,${response.image_data}`;
            setImageUrl(dataUrl);
            
            // Open the window after we have the image
            openImageWindow(dataUrl);
          } else {
            console.error('No image data returned from API');
          }
        } catch (error) {
          console.error('Error fetching image:', error);
        }
      }
    };
    
    loadImage();
    
    // Cleanup function
    return () => {
      if (windowRef.current) {
        windowRef.current.close();
        windowRef.current = null;
      }
    };
  }, [imageId]);
  
  const openImageWindow = (imageUrl) => {
    // Close previous window if one exists
    if (windowRef.current) {
      windowRef.current.close();
    }
    
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
  };
  
  // This component doesn't render anything
  return null;
}

export default ImageViewModal;