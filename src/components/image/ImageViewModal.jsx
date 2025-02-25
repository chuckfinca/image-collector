import React, { useEffect, useRef } from 'react';

function ImageViewModal({ imageUrl, onClose }) {
  const windowRef = useRef(null);
  const previousImageUrl = useRef(null);

  useEffect(() => {
    if (imageUrl && imageUrl !== previousImageUrl.current) {
      if (windowRef.current) {
        windowRef.current.close();
      }

      previousImageUrl.current = imageUrl;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Contact Info Image</title>
            <style>
              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
                background-color: #242424;
              }
              img {
                width: 100%;
                height: 100%;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <img src="${imageUrl.startsWith('data:') ? imageUrl : `data:image/jpeg;base64,${imageUrl}`}" 
                 alt="Contact Info" />
          </body>
        </html>
      `;

      const width = Math.min(1200, window.screen.availWidth * 0.8);
      const height = Math.min(800, window.screen.availHeight * 0.8);
      const left = (window.screen.availWidth - width) / 2;
      const top = (window.screen.availHeight - height) / 2;

      windowRef.current = window.open(
        '',
        'contactInfo',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes`
      );

      windowRef.current.document.write(htmlContent);
      windowRef.current.document.close();

      windowRef.current.onbeforeunload = () => {
        previousImageUrl.current = null;
        onClose();
      };
    }

    return () => {
      if (windowRef.current && !imageUrl) {
        windowRef.current.close();
        windowRef.current = null;
        previousImageUrl.current = null;
      }
    };
  }, [imageUrl, onClose]);

  return null;
}

export default ImageViewModal;