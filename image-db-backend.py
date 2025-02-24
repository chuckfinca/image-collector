from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, TypeVar, Generic, List, Optional
import sqlite3
import os
import aiohttp
from datetime import datetime
import hashlib
from PIL import Image
from io import BytesIO
import base64
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Create FastAPI app instance
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define a generic type for the data field
T = TypeVar('T')

class ServerResponse(BaseModel, Generic[T]):
    success: bool
    data: T
    error: Optional[str] = None
    timestamp: str

class ContactInfo(BaseModel):
    name: Dict[str, Optional[str]]
    work: Dict[str, Optional[str]]
    contact: Dict[str, List[str]]
    social: List[Dict[str, str]]
    notes: Optional[str] = None

class PostalAddress(BaseModel):
    street: Optional[str] = None
    sub_locality: Optional[str] = None
    city: Optional[str] = None
    sub_administrative_area: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    iso_country_code: Optional[str] = None

class SocialProfile(BaseModel):
    service: str
    url: Optional[str] = None
    username: str

class DbPath(BaseModel):
    db_path: str

class ImageUpdate(BaseModel):
    name_prefix: Optional[str] = None
    given_name: Optional[str] = None
    middle_name: Optional[str] = None
    family_name: Optional[str] = None
    name_suffix: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    organization_name: Optional[str] = None
    phone_numbers: Optional[List[str]] = None
    email_addresses: Optional[List[str]] = None
    url_addresses: Optional[List[str]] = None

class ImageDatabase:
    def __init__(self, db_path):
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            # Create main images table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    image_data BLOB NOT NULL,
                    hash TEXT UNIQUE,
                    date_added TIMESTAMP,
                    
                    -- Name Information
                    name_prefix TEXT,
                    given_name TEXT,
                    middle_name TEXT,
                    family_name TEXT,
                    name_suffix TEXT,
                    
                    -- Work Information
                    job_title TEXT,
                    department TEXT,
                    organization_name TEXT
                )
            """)
            
            # Create related tables for one-to-many relationships
            conn.execute("""
                CREATE TABLE IF NOT EXISTS phone_numbers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_id INTEGER,
                    phone_number TEXT,
                    FOREIGN KEY(image_id) REFERENCES images(id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS email_addresses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_id INTEGER,
                    email_address TEXT,
                    FOREIGN KEY(image_id) REFERENCES images(id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS postal_addresses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_id INTEGER,
                    street TEXT,
                    sub_locality TEXT,
                    city TEXT,
                    sub_administrative_area TEXT,
                    state TEXT,
                    postal_code TEXT,
                    country TEXT,
                    iso_country_code TEXT,
                    FOREIGN KEY(image_id) REFERENCES images(id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS url_addresses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_id INTEGER,
                    url TEXT,
                    FOREIGN KEY(image_id) REFERENCES images(id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS social_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_id INTEGER,
                    service TEXT,
                    url TEXT,
                    username TEXT,
                    FOREIGN KEY(image_id) REFERENCES images(id)
                )
            """)

    async def save_image(self, image_data: bytes, metadata: dict = None) -> bool:
        if metadata is None:
            metadata = {}
        
        image_hash = hashlib.sha256(image_data).hexdigest()
        
        try:
            img = Image.open(BytesIO(image_data))
            img.verify()
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                try:
                    # Insert main image record
                    cursor.execute("""
                        INSERT INTO images (
                            filename, image_data, hash, date_added,
                            name_prefix, given_name, middle_name, family_name, name_suffix,
                            job_title, department, organization_name
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        metadata.get('filename', 'unknown.jpg'),  # Add default filename
                        image_data, image_hash, datetime.now(),
                        metadata.get('name_prefix'), metadata.get('given_name'),
                        metadata.get('middle_name'), metadata.get('family_name'),
                        metadata.get('name_suffix'), metadata.get('job_title'),
                        metadata.get('department'), metadata.get('organization_name')
                    ))
                    
                    image_id = cursor.lastrowid
                    
                    # Insert related records
                    for phone in metadata.get('phone_numbers', []):
                        cursor.execute(
                            "INSERT INTO phone_numbers (image_id, phone_number) VALUES (?, ?)",
                            (image_id, phone)
                        )
                    
                    for email in metadata.get('email_addresses', []):
                        cursor.execute(
                            "INSERT INTO email_addresses (image_id, email_address) VALUES (?, ?)",
                            (image_id, email)
                        )
                    
                    for addr in metadata.get('postal_addresses', []):
                        cursor.execute("""
                            INSERT INTO postal_addresses (
                                image_id, street, sub_locality, city,
                                sub_administrative_area, state, postal_code,
                                country, iso_country_code
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            image_id, addr.get('street'), addr.get('sub_locality'),
                            addr.get('city'), addr.get('sub_administrative_area'),
                            addr.get('state'), addr.get('postal_code'),
                            addr.get('country'), addr.get('iso_country_code')
                        ))
                    
                    for url in metadata.get('url_addresses', []):
                        cursor.execute(
                            "INSERT INTO url_addresses (image_id, url) VALUES (?, ?)",
                            (image_id, url)
                        )
                    
                    for profile in metadata.get('social_profiles', []):
                        cursor.execute("""
                            INSERT INTO social_profiles (image_id, service, url, username)
                            VALUES (?, ?, ?, ?)
                        """, (
                            image_id, profile.get('service'),
                            profile.get('url'), profile.get('username')
                        ))
                    
                    return True
                    
                except sqlite3.IntegrityError as e:
                    print(f"Database integrity error: {e}")
                    return False
                except Exception as e:
                    print(f"Database insertion error: {e}")
                    return False
                    
        except Exception as e:
            print(f"Error in save_image: {e}")
            return False
        
    def update_image(self, image_id: int, update_data: Dict[str, Any]) -> bool:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # First, check if the table has the required columns
                cursor.execute("PRAGMA table_info(images)")
                existing_columns = {col[1] for col in cursor.fetchall()}
                
                # Add any missing columns
                required_columns = {
                    'name_prefix': 'TEXT',
                    'given_name': 'TEXT',
                    'middle_name': 'TEXT',
                    'family_name': 'TEXT',
                    'name_suffix': 'TEXT',
                    'job_title': 'TEXT',
                    'department': 'TEXT',
                    'organization_name': 'TEXT'
                }
                
                for column, type_ in required_columns.items():
                    if column not in existing_columns:
                        cursor.execute(f"ALTER TABLE images ADD COLUMN {column} {type_}")
                
                # Update main image fields
                main_fields = [
                    'name_prefix', 'given_name', 'middle_name', 'family_name',
                    'name_suffix', 'job_title', 'department', 'organization_name'
                ]
                
                # Filter out fields that are actually present in the update
                update_fields = {k: v for k, v in update_data.items() if k in main_fields}
                
                if update_fields:
                    query = "UPDATE images SET " + ", ".join(f"{k} = ?" for k in update_fields.keys())
                    query += " WHERE id = ?"
                    cursor.execute(query, list(update_fields.values()) + [image_id])
                
                # Update phone numbers
                if 'phone_numbers' in update_data:
                    cursor.execute("DELETE FROM phone_numbers WHERE image_id = ?", (image_id,))
                    for phone in (update_data['phone_numbers'] or []):
                        if phone and phone.strip():
                            cursor.execute(
                                "INSERT INTO phone_numbers (image_id, phone_number) VALUES (?, ?)",
                                (image_id, phone.strip())
                            )
                
                # Update email addresses
                if 'email_addresses' in update_data:
                    cursor.execute("DELETE FROM email_addresses WHERE image_id = ?", (image_id,))
                    for email in (update_data['email_addresses'] or []):
                        if email and email.strip():
                            cursor.execute(
                                "INSERT INTO email_addresses (image_id, email_address) VALUES (?, ?)",
                                (image_id, email.strip())
                            )
                
                # Update URLs
                if 'url_addresses' in update_data:
                    cursor.execute("DELETE FROM url_addresses WHERE image_id = ?", (image_id,))
                    for url in (update_data['url_addresses'] or []):
                        if url and url.strip():
                            cursor.execute(
                                "INSERT INTO url_addresses (image_id, url) VALUES (?, ?)",
                                (image_id, url.strip())
                            )
                
                return True
        except Exception as e:
            print(f"Error updating image: {e}")
            return False

    # Then update the extract_contact_info method in ImageDatabase class
    async def extract_contact_info(self, image_id: int) -> dict:
        """Extract contact information from an image using the LLM server."""
        try:
            print(f"Starting extraction for image_id: {image_id}")
            
            # Get the image data and filename from the database
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT image_data, filename FROM images WHERE id = ?", (image_id,))
                result = cursor.fetchone()
                if not result:
                    print(f"Image not found for id: {image_id}")
                    raise Exception("Image not found")
                
                image_data, filename = result
                print(f"Found image with filename: {filename}")
                
            # Convert image data to base64
            base64_image = base64.b64encode(image_data).decode('utf-8')
            print("Successfully converted image to base64")
            
            # Prepare the request body
            request_body = {
                "pipeline_id": "extract-contact",
                "content": base64_image,
                "media_type": "image",
                "params": {
                    "model_id": "gpt-4o-mini"
                }
            }
            
            # Call the LLM server with proper authentication
            headers = {
                "Content-Type": "application/json",
                "X-API-Key": os.getenv("LLM_SERVER_API_KEY")
            }
            
            async with aiohttp.ClientSession() as session:
                print("Making request to LLM server...")
                async with session.post(
                    "https://api.appsimple.io/v1/extract-contact",
                    json=request_body,
                    headers=headers,
                    timeout=60
                ) as response:
                    print(f"Received response with status: {response.status}")
                    if not 200 <= response.status < 300:
                        error_text = await response.text()
                        print(f"HTTP error response: {error_text}")
                        raise Exception(f"LLM server HTTP error {response.status}: {error_text}")
                    
                    raw_response = await response.json()
                    print("Raw server response:", raw_response)
                    
                    try:
                        server_response = ServerResponse[ContactInfo].model_validate(raw_response)
                        print("Successfully validated server response")
                    except Exception as validation_error:
                        print(f"Validation error: {validation_error}")
                        raise
                    
                    if not server_response.success:
                        error_msg = server_response.error or 'Unknown error'
                        print(f"Server indicated failure: {error_msg}")
                        raise Exception(f"LLM server error: {error_msg}")
                    
                    contact_info = server_response.data
                    print("Contact info after validation:", contact_info)
                    
                    # Map the nested data to our database structure
                    try:
                        mapped_info = {
                            "name_prefix": contact_info.name.get('prefix', ''),
                            "given_name": contact_info.name.get('given_name', ''),
                            "middle_name": contact_info.name.get('middle_name', ''),
                            "family_name": contact_info.name.get('family_name', ''),
                            "name_suffix": contact_info.name.get('suffix', ''),
                            "job_title": contact_info.work.get('job_title', ''),
                            "department": contact_info.work.get('department', ''),
                            "organization_name": contact_info.work.get('organization_name', ''),
                            "email_addresses": contact_info.contact.get('email_addresses', []),
                            "phone_numbers": contact_info.contact.get('phone_numbers', []),
                            "url_addresses": contact_info.contact.get('url_addresses', [])
                        }
                        print("Successfully mapped contact info to database structure")
                    except Exception as mapping_error:
                        print(f"Error during mapping: {mapping_error}")
                        raise
                    
                    # Update the database with extracted information
                    print("Updating database with mapped info")
                    self.update_image(image_id, mapped_info)
                    return mapped_info
                        
        except Exception as e:
            print(f"Error extracting contact info: {e}")
            print(f"Error type: {type(e)}")
            import traceback
            print("Full traceback:")
            print(traceback.format_exc())
            raise

# Global database instance
image_db = None

@app.post("/init")
async def init_database(db_config: DbPath):
    global image_db
    try:
        image_db = ImageDatabase(db_config.db_path)
        return {"success": True, "message": "Database initialized successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload/file")
async def upload_file(file: UploadFile = File(...)):
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    contents = await file.read()
    success = await image_db.save_image(contents, metadata={'filename': file.filename})
    return {"success": success}

@app.post("/upload/url")
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

@app.get("/status")
async def get_status():
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    with sqlite3.connect(image_db.db_path) as conn:
        count = conn.execute("SELECT COUNT(*) FROM images").fetchone()[0]
    return {"total_images": count}

@app.get("/images")
async def get_images():
    print("Fetching images from database")

    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    with sqlite3.connect(image_db.db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get main image data
        cursor.execute("""
            SELECT * FROM images 
            ORDER BY date_added DESC
        """)
        rows = cursor.fetchall()
        print(f"Found {len(rows)} images in database")

        images = []
        for row in rows:
            try:
                image_id = row['id']
                print(f"Processing image ID: {image_id}")
                
                # Create image_dict first
                image_dict = dict(row)
                # Remove binary data early to avoid printing it
                image_data = image_dict.pop('image_data')
                print(f"Image data type: {type(image_data)}")
                print(f"Image metadata: {image_dict}")
                
                # Create thumbnail with better error handling
                thumbnail = None
                if image_data:
                    try:
                        # Safely open the image
                        img_buffer = BytesIO(image_data)
                        img = Image.open(img_buffer)
                        print(f"Image format: {img.format}, Size: {img.size}")
                        
                        # Create thumbnail
                        img.thumbnail((200, 200))
                        thumb_buffer = BytesIO()
                        img.save(thumb_buffer, format=img.format or 'JPEG')
                        thumbnail = f"data:image/{(img.format or 'jpeg').lower()};base64,{base64.b64encode(thumb_buffer.getvalue()).decode()}"
                        print("Thumbnail created successfully")
                    except Exception as e:
                        print(f"Thumbnail creation error: {str(e)}")
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
                print(f"Successfully added image ID: {image_id} to response")
                
            except Exception as e:
                print(f"Error processing image: {str(e)}")
                # Continue with next image instead of failing completely
                continue

        print(f"Returning {len(images)} images")
        return {"images": images}

@app.put("/update/{image_id}")
async def update_image_data(image_id: int, update_data: ImageUpdate):
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    success = image_db.update_image(image_id, update_data.model_dump(exclude_unset=True))
    
    if success:
        return {"success": True, "message": "Image updated successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to update image")
    
@app.post("/extract/{image_id}")
async def extract_contact(image_id: int):
    if not image_db:
        raise HTTPException(status_code=400, detail="Database not initialized")
    
    try:
        contact_info = await image_db.extract_contact_info(image_id)
        return {"success": True, "data": contact_info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/image/{image_id}")
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
    
@app.get("/image/{image_id}")
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