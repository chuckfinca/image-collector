# Add these changes to the beginning of your api.py file

import os
import sqlite3
import aiohttp
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
import logging
from .models import DbPath, ImageUpdate, VersionCreate
from .database import ImageDatabase
from .utils import get_db_connection, create_thumbnail
from io import BytesIO
import base64
from PIL import Image

router = APIRouter()
logger = logging.getLogger("image-db")

# Create a persistent file to store the current database path
DB_PATH_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "current_db_path.txt")
image_db = None

# Function to get or create the ImageDatabase instance
def get_image_db():
    # Check if we have a saved path
    if os.path.exists(DB_PATH_FILE):
        try:
            with open(DB_PATH_FILE, 'r') as f:
                saved_path = f.read().strip()
                
            if saved_path and os.path.exists(os.path.dirname(os.path.abspath(saved_path))):
                logger.info(f"Using saved database path: {saved_path}")
                return ImageDatabase(saved_path)
        except Exception as e:
            logger.error(f"Error reading saved database path: {e}")
    
    # If we reach here, we don't have a valid saved path
    logger.warning("No valid database path found")
    return None

# Initialize global db reference
image_db = get_image_db()

@router.post("/init")
async def init_database(db_config: DbPath):
    global image_db
    try:
        # Create database directory if it doesn't exist
        db_path = db_config.db_path
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
        
        # Initialize the database
        image_db = ImageDatabase(db_path)
        
        # Save the path for persistence
        with open(DB_PATH_FILE, 'w') as f:
            f.write(db_path)
            
        logger.info(f"Database initialized at {db_path}")
        
        return {"success": True, "message": "Database initialized successfully"}
    except Exception as e:
        logger.error(f"Database initialization error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Now use get_image_db as a dependency in your other endpoints
@router.get("/status")
async def get_status():
    global image_db
    if not image_db:
        # Try to recover the database connection
        image_db = get_image_db()
        
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    try:
        with sqlite3.connect(image_db.db_path) as conn:
            count = conn.execute("SELECT COUNT(*) FROM images").fetchone()[0]
        return {"total_images": count}
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/images")
async def get_images():
    global image_db
    logger.info("Fetching images from database")
    
    if not image_db:
        # Try to recover the database connection
        image_db = get_image_db()
    
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    logger.info(f"Using database at path: {image_db.db_path}")
    
    try:
        with sqlite3.connect(image_db.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get main image data
            cursor.execute("""
                SELECT * FROM images 
                ORDER BY date_added DESC
            """)
            rows = cursor.fetchall()
            logger.info(f"Found {len(rows)} images in database")

            images = []
            for row in rows:
                try:
                    image_id = row['id']
                    logger.info(f"Processing image ID: {image_id}")
                    
                    # Create a copy of the row data
                    image_dict = dict(row)
                    
                    # Remove binary data early
                    image_data = image_dict.pop('image_data')
                    
                    # Create thumbnail with better error handling
                    thumbnail = None
                    if image_data:
                        try:
                            # Check if we have valid image data
                            if len(image_data) > 0:
                                img_buffer = BytesIO(image_data)
                                img = Image.open(img_buffer)
                                
                                # Create thumbnail
                                img.thumbnail((200, 200))
                                thumb_buffer = BytesIO()
                                save_format = img.format if img.format else 'JPEG'
                                img.save(thumb_buffer, format=save_format)
                                thumbnail_data = thumb_buffer.getvalue()
                                thumbnail = f"data:image/{save_format.lower()};base64,{base64.b64encode(thumbnail_data).decode()}"
                                logger.info(f"Generated thumbnail for image {image_id}")
                        except Exception as e:
                            logger.error(f"Thumbnail creation error for image {image_id}: {e}")
                            # Continue without thumbnail
                    
                    # Get related data
                    cursor.execute("SELECT phone_number FROM phone_numbers WHERE image_id = ?", (image_id,))
                    phone_numbers = [r[0] for r in cursor.fetchall()]
                    
                    cursor.execute("SELECT email_address FROM email_addresses WHERE image_id = ?", (image_id,))
                    email_addresses = [r[0] for r in cursor.fetchall()]
                    
                    cursor.execute("SELECT * FROM postal_addresses WHERE image_id = ?", (image_id,))
                    postal_addresses = [dict(r) for r in cursor.fetchall()]
                    
                    cursor.execute("SELECT url FROM url_addresses WHERE image_id = ?", (image_id,))
                    url_addresses = [r[0] for r in cursor.fetchall()]
                    
                    cursor.execute("SELECT service, url, username FROM social_profiles WHERE image_id = ?", (image_id,))
                    social_profiles = [dict(zip(['service', 'url', 'username'], r)) for r in cursor.fetchall()]

                    # Update the image dict with all data
                    image_dict.update({
                        'thumbnail': thumbnail,
                        'phone_numbers': phone_numbers,
                        'email_addresses': email_addresses,
                        'postal_addresses': postal_addresses,
                        'url_addresses': url_addresses,
                        'social_profiles': social_profiles
                    })
                    
                    # Add to images list - ALWAYS include the image even without thumbnail
                    images.append(image_dict)
                    logger.info(f"Added image {image_id} to response")
                    
                except Exception as e:
                    logger.error(f"Error processing image {image_id}: {e}")
                    # Try to include minimal information
                    try:
                        minimal_image = {
                            'id': row['id'],
                            'date_added': row['date_added'] if 'date_added' in row else None,
                            'error': str(e)
                        }
                        images.append(minimal_image)
                        logger.info(f"Added minimal info for image {image_id}")
                    except:
                        logger.error(f"Failed to add even minimal info for an image")

            logger.info(f"Returning {len(images)} images")
            return {"images": images}
    
    except Exception as e:
        logger.error(f"Error fetching images: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
@router.put("/update/{image_id}")
async def update_image_data(image_id: int, update_data: ImageUpdate):
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    success = image_db.update_image(image_id, update_data.model_dump(exclude_unset=True))
    
    if success:
        return {"success": True, "message": "Image updated successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to update image")
    
@router.post("/extract/{image_id}")
async def extract_contact(image_id: int):
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    logger.info(f"Extract contact request for image ID: {image_id}")
    
    try:
        # Verify image exists first
        with get_db_connection(image_db.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM images WHERE id = ?", (image_id,))
            if not cursor.fetchone():
                logger.warning(f"Image ID {image_id} not found")
                raise HTTPException(status_code=404, detail="Image not found")
        
        result = await image_db.extract_contact_info(image_id)
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
            
        logger.info(f"Successfully extracted contact info for image ID: {image_id}")
        return {"success": True, "data": result["data"]}
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error extracting contact info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Extraction error: {str(e)}")

@router.get("/image/{image_id}")
async def get_full_image(image_id: int):
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    with sqlite3.connect(image_db.db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT image_data FROM images WHERE id = ?", (image_id,))
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Image not found")
        
        image_data = result[0]
        if image_data:
            try:
                # Convert to base64
                image_base64 = base64.b64encode(image_data).decode('utf-8')
                return {"image_data": image_base64}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        else:
            raise HTTPException(status_code=404, detail="Image data not found")
        
@router.post("/upload/file")
async def upload_image_file(file: UploadFile = File(...)):
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized - please connect to a database first")
    
    logger.info(f"Received file upload: {file.filename}, content_type: {file.content_type}")
    
    # Validate file is an image
    if not file.content_type.startswith('image/'):
        logger.warning(f"Non-image file uploaded: {file.filename}, content_type: {file.content_type}")
        raise HTTPException(status_code=400, detail=f"File must be an image (received {file.content_type})")
    
    try:
        # Read file content
        contents = await file.read()
        logger.info(f"Read {len(contents)} bytes from file {file.filename}")
        
        if not contents or len(contents) == 0:
            logger.error(f"Empty file content for {file.filename}")
            raise HTTPException(status_code=400, detail="File content is empty - please select a valid image")
        
        # Get file metadata
        metadata = {
            'filename': file.filename
        }
        
        # Try to verify it's a valid image
        try:
            from PIL import Image
            from io import BytesIO
            img = Image.open(BytesIO(contents))
            img.verify()  # Verify it's a valid image
            logger.info(f"Image verified: {file.filename}, format: {img.format}, size: {getattr(img, 'size', 'unknown')}")
        except Exception as img_error:
            logger.error(f"Invalid image format: {file.filename}, error: {img_error}")
            raise HTTPException(status_code=400, detail=f"Invalid image format: {str(img_error)}")
        
        # Save to database
        logger.info(f"Saving image to database: {file.filename}")
        success = await image_db.save_image(contents, metadata)
        
        if success:
            logger.info(f"Successfully saved image: {file.filename}")
            return {"success": True, "message": "Image uploaded successfully"}
        else:
            logger.warning(f"Failed to save image: {file.filename}")
            raise HTTPException(status_code=400, detail="Failed to save image - it may be a duplicate (already exists in database)")
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")

@router.post("/upload/url")
async def upload_image_url(url: str = Form(...)):
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    logger.info(f"Received URL upload: {url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    raise HTTPException(status_code=400, detail=f"Failed to fetch image from URL (status: {response.status})")
                
                # Read image content
                contents = await response.read()
                
                # Extract filename from URL
                filename = url.split('/')[-1].split('?')[0] or "image.jpg"
                
                # Save to database
                metadata = {
                    'filename': filename
                }
                
                success = await image_db.save_image(contents, metadata)
                
                if success:
                    logger.info(f"Successfully saved image from URL: {url}")
                    return {"success": True, "message": "Image uploaded successfully"}
                else:
                    logger.warning(f"Failed to save image from URL: {url}")
                    raise HTTPException(status_code=400, detail="Failed to save image (possibly a duplicate)")
    
    except Exception as e:
        logger.error(f"Error uploading from URL: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/version/{image_id}")
async def create_image_version(
    image_id: int, 
    version_data: VersionCreate,
    image_db: ImageDatabase = Depends(get_image_db)
):
    """Create a new version for an image."""
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    # Log what we're doing
    logger.info(f"Creating version for image {image_id} with data: {version_data.model_dump()}")
    
    # If creating a blank version, ignore source_version_id
    if version_data.create_blank:
        logger.info(f"Creating blank version for image {image_id}, ignoring source_version_id")
        source_version_id = None
    else:
        # Validate source_version_id if provided
        source_version_id = version_data.source_version_id
        if source_version_id is not None:
            try:
                # Verify source version exists
                with get_db_connection(image_db.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT id FROM image_versions WHERE id = ?", (source_version_id,))
                    if not cursor.fetchone():
                        logger.warning(f"Source version ID {source_version_id} not found, setting to None")
                        source_version_id = None
            except Exception as e:
                logger.error(f"Error validating source version: {e}")
                source_version_id = None
    
    try:
        # Create the version
        version_id = await image_db.create_version(
            image_id=image_id,
            tag=version_data.tag,
            source_version_id=source_version_id,
            notes=version_data.notes,
            create_blank=version_data.create_blank  # Pass the create_blank flag
        )
        
        logger.info(f"Successfully created version {version_id} for image {image_id}")
        return {"success": True, "version_id": version_id}
    except Exception as e:
        logger.error(f"Error creating version: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/versions/{image_id}")
async def get_image_versions(
    image_id: int,
    image_db: ImageDatabase = Depends(get_image_db)
):
    """Get all versions for an image."""
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    versions = image_db.get_image_versions(image_id)
    return {"versions": versions}

@router.put("/version/{version_id}")
async def update_version(
    version_id: int, 
    update_data: ImageUpdate,
    image_db: ImageDatabase = Depends(get_image_db)
):
    """Update a specific version."""
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    success = image_db.update_version(version_id, update_data.model_dump(exclude_unset=True))
    
    if success:
        return {"success": True, "message": "Version updated successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to update version")
    
# Error status code mapping
ERROR_CODES = {
    "not_found": 404,
    "validation_error": 400,
    "only_version": 400,
    "duplicate": 409
}

def handle_result(result, success_message):
    """Convert operation result to HTTP response"""
    if result.success:
        return {"success": True, "message": success_message, **({"data": result.data} if result.data else {})}
    
    status_code = ERROR_CODES.get(result.error_type, 500)
    raise HTTPException(status_code=status_code, detail=result.error_message)

@router.delete("/image/{image_id}")
async def delete_image(image_id: int):
    """Delete an image and all its data"""
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    result = image_db.delete_image(image_id)
    return handle_result(result, "Image deleted successfully")

@router.delete("/version/{version_id}")
async def delete_version(version_id: int, image_db: ImageDatabase = Depends(get_image_db)):
    """Delete a version and all its data"""
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    result = image_db.delete_version(version_id)
    return handle_result(result, "Version deleted successfully")