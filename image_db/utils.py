import sqlite3
import logging
from typing import Union
from io import BytesIO
from PIL import Image
import base64

logger = logging.getLogger("image-db")

def get_db_connection(db_path: str) -> sqlite3.Connection:
    """Create and return a database connection with row factory set."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def create_thumbnail(image_data: bytes, size: tuple = (200, 200)) -> Union[str, None]:
    """Create a base64 thumbnail from image data with error handling."""
    if not image_data:
        return None
    
    try:
        img_buffer = BytesIO(image_data)
        img = Image.open(img_buffer)
        
        # Verify image format before proceeding
        if not img.format:
            logger.warning("Unknown image format, defaulting to JPEG")
            img.format = 'JPEG'  # Set a default format
            
        # Create thumbnail
        img.thumbnail(size)
        thumb_buffer = BytesIO()
        img.save(thumb_buffer, format=img.format)
        thumbnail = f"data:image/{img.format.lower()};base64,{base64.b64encode(thumb_buffer.getvalue()).decode()}"
        return thumbnail
    except Exception as e:
        logger.error(f"Thumbnail creation error: {str(e)}", exc_info=True)
        return None