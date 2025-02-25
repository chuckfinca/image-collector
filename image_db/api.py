from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Dict, Any
import aiohttp
import logging
from .models import DbPath, ImageUpdate
from .database import ImageDatabase
from .utils import get_db_connection, create_thumbnail

router = APIRouter()
logger = logging.getLogger("image-db")

# Reference to the database instance
image_db = None

@router.post("/init")
async def init_database(db_config: DbPath):
    global image_db
    try:
        image_db = ImageDatabase(db_config.db_path)
        return {"success": True, "message": "Database initialized successfully"}
    except Exception as e:
        logger.error(f"Database initialization error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/file")
async def upload_file(file: UploadFile = File(...)):
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    contents = await file.read()
    success = await image_db.save_image(contents, metadata={'filename': file.filename})
    return {"success": success}

@router.post("/upload/url")
async def upload_url(url: str = Form(...)):
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                image_data = await response.read()
                success = await image_db.save_image(image_data, {'url_addresses': [url]})
                return {"success": success}
            return {"success": False, "error": "Failed to fetch image"}

@router.get("/status")
async def get_status():
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    with sqlite3.connect(image_db.db_path) as conn:
        count = conn.execute("SELECT COUNT(*) FROM images").fetchone()[0]
    return {"total_images": count}

@router.get("/images")
async def get_images():
    logger.info("Fetching images from database")

    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    try:
        with get_db_connection(image_db.db_path) as conn:
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
                
                # Create image_dict first
                image_dict = dict(row)
                # Remove binary data early to avoid printing it
                image_data = image_dict.pop('image_data')
                logger.info(f"Image data type: {type(image_data)}")
                logger.info(f"Image metadata: {image_dict}")
                
                # Create thumbnail with better error handling
                thumbnail = None
                if image_data:
                    try:
                        # Safely open the image
                        img_buffer = BytesIO(image_data)
                        img = Image.open(img_buffer)
                        logger.info(f"Image format: {img.format}, Size: {img.size}")
                        
                        # Create thumbnail
                        img.thumbnail((200, 200))
                        thumb_buffer = BytesIO()
                        img.save(thumb_buffer, format=img.format or 'JPEG')
                        thumbnail = f"data:image/{(img.format or 'jpeg').lower()};base64,{base64.b64encode(thumb_buffer.getvalue()).decode()}"
                        logger.info("Thumbnail created successfully")
                    except Exception as e:
                        logger.info(f"Thumbnail creation error: {str(e)}")
                        # Use a placeholder instead of failing
                        thumbnail = None
                
                # Get phone numbers
                cursor.execute("SELECT phone_number FROM phone_numbers WHERE image_id = ?", (image_id,))
                phone_numbers = [r[0] for r in cursor.fetchall()]
                
                # Get email addresses
                cursor.execute("SELECT email_address FROM email_addresses WHERE image_id = ?", (image_id,))
                email_addresses = [r[0] for r in cursor.fetchall()]
                
                # Get postal addresses
                cursor.execute("SELECT * FROM postal_addresses WHERE image_id = ?", (image_id,))
                postal_addresses = [dict(r) for r in cursor.fetchall()]
                
                # Get URLs
                cursor.execute("SELECT url FROM url_addresses WHERE image_id = ?", (image_id,))
                url_addresses = [r[0] for r in cursor.fetchall()]
                
                # Get social profiles
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
                
                # Add to images list
                images.append(image_dict)
                logger.info(f"Successfully added image ID: {image_id} to response")
                
            except Exception as e:
                logger.info(f"Error processing image: {str(e)}")
                # Continue with next image instead of failing completely
                continue

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
        
        contact_info = await image_db.extract_contact_info(image_id)
        logger.info(f"Successfully extracted contact info for image ID: {image_id}")
        return {"success": True, "data": contact_info}
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error extracting contact info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Extraction error: {str(e)}")
    
@router.delete("/image/{image_id}")
async def delete_image(image_id: int):
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    try:
        with sqlite3.connect(image_db.db_path) as conn:
            cursor = conn.cursor()
            
            # Delete related records first
            cursor.execute("DELETE FROM phone_numbers WHERE image_id = ?", (image_id,))
            cursor.execute("DELETE FROM email_addresses WHERE image_id = ?", (image_id,))
            cursor.execute("DELETE FROM postal_addresses WHERE image_id = ?", (image_id,))
            cursor.execute("DELETE FROM url_addresses WHERE image_id = ?", (image_id,))
            cursor.execute("DELETE FROM social_profiles WHERE image_id = ?", (image_id,))
            
            # Delete the main image record
            cursor.execute("DELETE FROM images WHERE id = ?", (image_id,))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Image not found")
                
            return {"success": True, "message": "Image deleted successfully"}
            
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
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