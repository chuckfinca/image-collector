from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import os
import aiofiles
import aiohttp
from datetime import datetime
import hashlib
from PIL import Image
from io import BytesIO
import base64
from typing import Any, Dict, List, Optional

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
                    organization_name TEXT,
                    
                    -- Notes
                    notes TEXT
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
                            image_data, hash, date_added,
                            name_prefix, given_name, middle_name, family_name, name_suffix,
                            job_title, department, organization_name,
                            notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        image_data, image_hash, datetime.now(),
                        metadata.get('name_prefix'), metadata.get('given_name'),
                        metadata.get('middle_name'), metadata.get('family_name'),
                        metadata.get('name_suffix'), metadata.get('job_title'),
                        metadata.get('department'), metadata.get('organization_name'),
                        metadata.get('notes')
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
                except sqlite3.IntegrityError:
                    return False
                
        except Exception as e:
            print(f"Error saving image: {e}")
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
    success = await image_db.save_image(contents)
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
        
        images = []
        for row in rows:
            image_data = row['image_data']
            image_id = row['id']
            
            # Create thumbnail
            if image_data:
                try:
                    img = Image.open(BytesIO(image_data))
                    img.thumbnail((200, 200))
                    thumb_buffer = BytesIO()
                    img.save(thumb_buffer, format=img.format)
                    thumbnail = f"data:image/{img.format.lower()};base64,{base64.b64encode(thumb_buffer.getvalue()).decode()}"
                except Exception as e:
                    print(f"Error creating thumbnail: {e}")
                    thumbnail = None
            else:
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

            # Combine all data
            image_dict = dict(row)
            del image_dict['image_data']  # Remove binary data from response
            image_dict.update({
                'thumbnail': thumbnail,
                'phone_numbers': phone_numbers,
                'email_addresses': email_addresses,
                'postal_addresses': postal_addresses,
                'url_addresses': url_addresses,
                'social_profiles': social_profiles
            })
            
            images.append(image_dict)
            
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