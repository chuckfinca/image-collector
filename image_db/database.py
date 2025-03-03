import sqlite3
import os
import hashlib
from datetime import datetime
from typing import Any, Dict
from PIL import Image
from io import BytesIO
import base64
import aiohttp
import logging
from .models import ContactInfo, ServerResponse

logger = logging.getLogger("image-db")

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
                    logger.info(f"Database integrity error: {e}")
                    return False
                except Exception as e:
                    logger.info(f"Database insertion error: {e}")
                    return False
                    
        except Exception as e:
            logger.info(f"Error in save_image: {e}")
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
                # Update postal addresses
                if 'postal_addresses' in update_data:
                    cursor.execute("DELETE FROM postal_addresses WHERE image_id = ?", (image_id,))
                    for address in (update_data['postal_addresses'] or []):
                        if any(value for key, value in address.items() if key not in ['id', 'image_id'] and value):
                            cursor.execute("""
                                INSERT INTO postal_addresses (
                                    image_id, street, sub_locality, city,
                                    sub_administrative_area, state, postal_code,
                                    country, iso_country_code
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                image_id, 
                                address.get('street', ''), 
                                address.get('sub_locality', ''),
                                address.get('city', ''), 
                                address.get('sub_administrative_area', ''),
                                address.get('state', ''), 
                                address.get('postal_code', ''),
                                address.get('country', ''), 
                                address.get('iso_country_code', '')
                            ))
                
                return True
        except Exception as e:
            logger.info(f"Error updating image: {e}")
            return False

        
    async def extract_contact_info(self, image_id: int) -> dict:
        """Extract contact information from an image using the LLM server."""
        try:
            logger.info(f"Starting extraction for image_id: {image_id}")
            
            # Get the image data and filename from the database
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT image_data, filename FROM images WHERE id = ?", (image_id,))
                result = cursor.fetchone()
                if not result:
                    logger.info(f"Image not found for id: {image_id}")
                    raise Exception("Image not found")
                
                image_data, filename = result
                logger.info(f"Found image with filename: {filename}")
                
            # Convert image data to base64
            base64_image = base64.b64encode(image_data).decode('utf-8')
            logger.info("Successfully converted image to base64")
            
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
                logger.info("Making request to LLM server...")
                async with session.post(
                    "https://api.appsimple.io/v1/extract-contact",
                    json=request_body,
                    headers=headers,
                    timeout=60
                ) as response:
                    logger.info(f"Received response with status: {response.status}")
                    if not 200 <= response.status < 300:
                        error_text = await response.text()
                        logger.info(f"HTTP error response: {error_text}")
                        raise Exception(f"LLM server HTTP error {response.status}: {error_text}")
                    
                    raw_response = await response.json()
                    logger.info(f"Raw server response: {raw_response}")
                    
                    try:
                        server_response = ServerResponse[ContactInfo].model_validate(raw_response)
                        logger.info("Successfully validated server response")
                        
                        if not server_response.success:
                            error_msg = server_response.error or 'Unknown error'
                            logger.info(f"Server indicated failure: {error_msg}")
                            raise Exception(f"LLM server error: {error_msg}")
                        
                        contact_info = server_response.data
                        
                        # Map the nested data to our database structure
                        mapped_info = {
                            "name_prefix": contact_info.name.get('prefix', ''),
                            "given_name": contact_info.name.get('given_name', ''),
                            "middle_name": contact_info.name.get('middle_name', ''),
                            "family_name": contact_info.name.get('family_name', ''),
                            "name_suffix": contact_info.name.get('suffix', ''),
                            "job_title": contact_info.work.get('job_title', ''),
                            "department": contact_info.work.get('department', ''),
                            "organization_name": contact_info.work.get('organization_name', ''),
                            "email_addresses": contact_info.contact.email_addresses,
                            "phone_numbers": contact_info.contact.phone_numbers,
                            "url_addresses": contact_info.contact.url_addresses
                        }
                        
                        mapped_info["postal_addresses"] = []
                        if contact_info.contact.postal_addresses:
                            for addr in contact_info.contact.postal_addresses:
                                # Map each PostalAddress object to a dictionary with the fields from our database schema
                                address_dict = {
                                    'street': addr.street,
                                    'city': addr.city,
                                    'sub_locality': '',  # These might not be present in the extraction
                                    'sub_administrative_area': '',
                                    'state': addr.state,
                                    'postal_code': addr.postal_code,
                                    'country': addr.country,
                                    'iso_country_code': ''
                                }
                                mapped_info["postal_addresses"].append(address_dict)
                        
                        logger.info("Successfully mapped contact info to database structure")
                        logger.info(f"Mapped info: {mapped_info}")
                        
                        # Update the database with extracted information
                        logger.info("Updating database with mapped info")
                        self.update_image(image_id, mapped_info)
                        return mapped_info
                        
                    except Exception as validation_error:
                        logger.info(f"Validation error: {validation_error}")
                        raise Exception(f"Failed to parse server response: {validation_error}")
                        
        except Exception as e:
            logger.info(f"Error extracting contact info: {e}")
            logger.info(f"Error type: {type(e)}")
            import traceback
            logger.info("Full traceback:")
            logger.info(traceback.format_exc())
            raise