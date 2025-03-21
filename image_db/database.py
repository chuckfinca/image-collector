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

from .utils import OperationResult
from .models import ContactInfo, ServerResponse

logger = logging.getLogger("image-db")

class ImageDatabase:
    def __init__(self, db_path):
        self.db_path = db_path
        
        # Create the base directory for the database if it doesn't exist
        db_dir = os.path.dirname(os.path.abspath(db_path))
        os.makedirs(db_dir, exist_ok=True)
        
        # Set the image_dir attribute (missing attribute that's causing the error)
        # Store images in an 'images' subdirectory next to the database file
        self.image_dir = os.path.join(db_dir, 'images')
        os.makedirs(self.image_dir, exist_ok=True)
        
        # Initialize the database schema
        self.init_db()

    def init_db(self):
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            # Create main images table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,  
                    hash TEXT UNIQUE,         
                    date_added TIMESTAMP,
                    source TEXT,
                    
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
            
            # Create version tracking table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS image_versions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_id INTEGER NOT NULL,
                    tag TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    notes TEXT,
                    is_active BOOLEAN DEFAULT FALSE,
                    FOREIGN KEY(image_id) REFERENCES images(id) ON DELETE CASCADE
                )
            """)
            
            # Create version data table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS version_data (
                    version_id INTEGER NOT NULL,
                    name_prefix TEXT,
                    given_name TEXT,
                    middle_name TEXT,
                    family_name TEXT,
                    name_suffix TEXT,
                    job_title TEXT,
                    department TEXT,
                    organization_name TEXT,
                    PRIMARY KEY(version_id),
                    FOREIGN KEY(version_id) REFERENCES image_versions(id) ON DELETE CASCADE
                )
            """)
            
            # Create related data tables for versions
            conn.execute("""
                CREATE TABLE IF NOT EXISTS version_phone_numbers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version_id INTEGER,
                    phone_number TEXT,
                    FOREIGN KEY(version_id) REFERENCES image_versions(id) ON DELETE CASCADE
                )
            """)

            conn.execute("""         
                CREATE TABLE IF NOT EXISTS version_metadata (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version_id INTEGER NOT NULL,
                    model_id TEXT,
                    program_id TEXT,
                    program_name TEXT,
                    program_version TEXT, 
                    provider TEXT,
                    base_model TEXT,
                    execution_id TEXT,
                    extracted_at TIMESTAMP,
                    -- Reserved for future implementation of confidence scores
                    FOREIGN KEY(version_id) REFERENCES image_versions(id) ON DELETE CASCADE
                );
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS version_email_addresses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version_id INTEGER,
                    email_address TEXT,
                    FOREIGN KEY(version_id) REFERENCES image_versions(id) ON DELETE CASCADE
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS version_postal_addresses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version_id INTEGER,
                    street TEXT,
                    sub_locality TEXT,
                    city TEXT,
                    sub_administrative_area TEXT,
                    state TEXT,
                    postal_code TEXT,
                    country TEXT,
                    iso_country_code TEXT,
                    FOREIGN KEY(version_id) REFERENCES image_versions(id) ON DELETE CASCADE
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS version_url_addresses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version_id INTEGER,
                    url TEXT,
                    FOREIGN KEY(version_id) REFERENCES image_versions(id) ON DELETE CASCADE
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS version_social_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version_id INTEGER,
                    service TEXT,
                    url TEXT, 
                    username TEXT,
                    FOREIGN KEY(version_id) REFERENCES image_versions(id) ON DELETE CASCADE
                )
            """)
            
            # Create related tables for one-to-many relationships
            conn.execute("""
                CREATE TABLE IF NOT EXISTS phone_numbers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_id INTEGER,
                    phone_number TEXT,
                    FOREIGN KEY(image_id) REFERENCES images(id) ON DELETE CASCADE
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS email_addresses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_id INTEGER,
                    email_address TEXT,
                    FOREIGN KEY(image_id) REFERENCES images(id) ON DELETE CASCADE
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
                    FOREIGN KEY(image_id) REFERENCES images(id) ON DELETE CASCADE
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS url_addresses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_id INTEGER,
                    url TEXT,
                    FOREIGN KEY(image_id) REFERENCES images(id) ON DELETE CASCADE
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS social_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    image_id INTEGER,
                    service TEXT,
                    url TEXT,
                    username TEXT,
                    FOREIGN KEY(image_id) REFERENCES images(id) ON DELETE CASCADE
                )
            """)
        
    async def save_image(self, image_data: bytes, metadata: dict = None, source: str = "local") -> bool:
        """Save an image to disk and its metadata to the database."""
        if metadata is None:
            metadata = {}
        
        # Calculate image hash for duplicate detection
        image_hash = hashlib.sha256(image_data).hexdigest()
        
        try:
            # Validate it's a valid image
            img = Image.open(BytesIO(image_data))
            img.verify()
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if image already exists
                cursor.execute("SELECT id FROM images WHERE hash = ?", (image_hash,))
                if cursor.fetchone():
                    logger.info(f"Duplicate image detected with hash: {image_hash}")
                    return False
                
                try:
                    # Get filename from metadata or use default
                    filename = metadata.get('filename', 'image.jpg')
                    
                    # Create year/month directory structure
                    now = datetime.now()
                    year_dir = str(now.year)
                    month_dir = f"{now.month:02d}"
                    dir_path = os.path.join(self.image_dir, year_dir, month_dir)
                    os.makedirs(dir_path, exist_ok=True)
                    
                    # Create unique filename
                    base_name = os.path.splitext(os.path.basename(filename))[0]
                    ext = os.path.splitext(filename)[1].lower() or '.jpg'
                    safe_name = ''.join(c for c in base_name if c.isalnum() or c in '_-').strip()
                    if not safe_name:
                        safe_name = 'image'
                    unique_name = f"{image_hash[:8]}_{safe_name}{ext}"
                    
                    # Full path for storage
                    rel_path = os.path.join(year_dir, month_dir, unique_name)
                    abs_path = os.path.join(self.image_dir, rel_path)
                    
                    # Save image to disk
                    with open(abs_path, 'wb') as f:
                        f.write(image_data)
                    
                    logger.info(f"Saved image to: {abs_path}")
                    
                    # Store only the relative path in the database - now including source
                    cursor.execute("""
                        INSERT INTO images (
                            filename, file_path, hash, date_added, source,
                            name_prefix, given_name, middle_name, family_name, name_suffix,
                            job_title, department, organization_name
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        filename, rel_path, image_hash, datetime.now(), source,
                        metadata.get('name_prefix'), metadata.get('given_name'),
                        metadata.get('middle_name'), metadata.get('family_name'),
                        metadata.get('name_suffix'), metadata.get('job_title'),
                        metadata.get('department'), metadata.get('organization_name')
                    ))
                    
                    # Get the new image ID
                    image_id = cursor.lastrowid
                    
                    # COMMIT TRANSACTION EXPLICITLY
                    conn.commit()
                    
                    logger.info(f"Inserted image into database with ID: {image_id}")
                    
                    # Verify the image entry was created
                    cursor.execute("SELECT id FROM images WHERE id = ?", (image_id,))
                    if not cursor.fetchone():
                        logger.error(f"Failed to verify image ID {image_id} after insert")
                        return False
                    
                    # Create initial version
                    try:
                        version_id = await self.create_version(
                            image_id=image_id,
                            tag="original",
                            notes="Initial version",
                            create_blank=False
                        )
                        logger.info(f"Created initial version {version_id} for image {image_id}")
                        return True
                    except Exception as version_error:
                        logger.error(f"Error creating version: {version_error}")
                        # Don't return False here, since the image was saved successfully
                        return True
                except Exception as e:
                    logger.error(f"Error saving image: {e}", exc_info=True)
                    # Try to clean up file if database insert failed
                    if 'abs_path' in locals() and os.path.exists(abs_path):
                        os.remove(abs_path)
                    return False
                    
        except Exception as e:
            logger.error(f"Invalid image data: {e}")
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
        
    # In database.py, modify the create_version function to accept a create_blank parameter

    async def create_version(self, image_id: int, tag: str, source_version_id: int = None, notes: str = None, create_blank: bool = False) -> int:
        """
        Create a new version for an image.
        
        Args:
            image_id: ID of the image to version
            tag: Tag/label for this version (e.g., "extracted", "verified")
            source_version_id: Optional source version to copy data from
            notes: Optional notes about this version
            create_blank: If True, create a completely blank version with no data copied
            
        Returns:
            ID of the new version
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Verify the image exists
                cursor.execute("SELECT id FROM images WHERE id = ?", (image_id,))
                if not cursor.fetchone():
                    logger.error(f"Image ID {image_id} not found")
                    raise ValueError(f"Image ID {image_id} not found")
                
                # Create new version record
                cursor.execute("""
                    INSERT INTO image_versions (image_id, tag, created_at, notes, is_active)
                    VALUES (?, ?, CURRENT_TIMESTAMP, ?, TRUE)
                """, (image_id, tag, notes))
                
                version_id = cursor.lastrowid
                
                # Deactivate other versions for this image
                cursor.execute("""
                    UPDATE image_versions
                    SET is_active = FALSE
                    WHERE image_id = ? AND id != ?
                """, (image_id, version_id))
                
                # If creating a blank version, add an empty record with no data
                if create_blank:
                    logger.info(f"Creating empty version {version_id} for image {image_id}")
                    cursor.execute("""
                        INSERT INTO version_data (version_id, name_prefix, given_name, middle_name, 
                                                family_name, name_suffix, job_title, department, 
                                                organization_name)
                        VALUES (?, '', '', '', '', '', '', '', '')
                    """, (version_id,))
                    
                    # We don't need to copy any other data for a blank version
                    
                # If copying from existing version, copy the data
                elif source_version_id:
                    # Verify source version exists
                    cursor.execute("SELECT id FROM image_versions WHERE id = ?", (source_version_id,))
                    if not cursor.fetchone():
                        logger.error(f"Source version ID {source_version_id} not found")
                        raise ValueError(f"Source version ID {source_version_id} not found")
                    
                    self._copy_version_data(conn, source_version_id, version_id)
                else:
                    # No source version provided, copy from base image
                    logger.info(f"No source version provided for version {version_id}, copying from base image {image_id}")
                    # Get image_id from the version
                    cursor.execute("SELECT image_id FROM image_versions WHERE id = ?", (version_id,))
                    
                    # We'll use the _copy_version_data method's fallback to copy from base image
                    # when the source version data is not found
                    self._copy_version_data(conn, -1, version_id)  # Use an invalid source ID to trigger base image copy
                    
                return version_id
        except Exception as e:
            logger.error(f"Error creating version: {e}")
            raise

    def _copy_version_data(self, conn, source_version_id: int, target_version_id: int) -> None:
        """
        Copy data from one version to another, ensuring ALL fields are properly copied.
        
        Args:
            conn: SQLite connection
            source_version_id: ID of the source version
            target_version_id: ID of the target version
        """
        cursor = conn.cursor()
        logger.info(f"Copying data from version {source_version_id} to version {target_version_id}")
        
        try:
            # First check if source_version_id exists
            cursor.execute("SELECT id FROM image_versions WHERE id = ?", (source_version_id,))
            if not cursor.fetchone():
                logger.error(f"Source version ID {source_version_id} not found")
                return
                
            # Get image_id from the source version for copying directly from base image if needed
            cursor.execute("SELECT image_id FROM image_versions WHERE id = ?", (source_version_id,))
            image_id = cursor.fetchone()[0]
            logger.info(f"Source version belongs to image {image_id}")
            
            # 1. Copy main version data
            cursor.execute("SELECT * FROM version_data WHERE version_id = ?", (source_version_id,))
            main_data = cursor.fetchone()
            
            if main_data:
                logger.info("Copying main version data")
                
                # Convert row to dict if it's a Row object
                if isinstance(main_data, sqlite3.Row):
                    main_data = dict(main_data)
                    # Remove version_id from source data
                    main_data.pop('version_id', None)
                
                # Prepare field names and values
                if isinstance(main_data, dict):
                    fields = list(main_data.keys())
                    values = list(main_data.values())
                else:
                    fields = [desc[0] for desc in cursor.description if desc[0] != 'version_id']
                    values = [value for i, value in enumerate(main_data) if cursor.description[i][0] != 'version_id']
                
                if fields:
                    # Create placeholders and build query
                    fields_str = ', '.join(fields)
                    placeholders = ', '.join(['?'] * len(values))
                    
                    # Use INSERT OR REPLACE to handle case when record might already exist
                    insert_query = f"""
                        INSERT OR REPLACE INTO version_data (version_id, {fields_str})
                        VALUES (?, {placeholders})
                    """
                    
                    cursor.execute(insert_query, [target_version_id] + values)
                    logger.info(f"Copied {len(fields)} main data fields")
            else:
                # If no version data, copy from the base image
                logger.info("No source version data, copying from base image")
                cursor.execute("""
                    SELECT name_prefix, given_name, middle_name, family_name, name_suffix,
                        job_title, department, organization_name
                    FROM images WHERE id = ?
                """, (image_id,))
                
                base_image_data = cursor.fetchone()
                if base_image_data:
                    if isinstance(base_image_data, sqlite3.Row):
                        base_image_dict = dict(base_image_data)
                        fields = list(base_image_dict.keys())
                        values = list(base_image_dict.values())
                    else:
                        fields = [desc[0] for desc in cursor.description]
                        values = list(base_image_data)
                    
                    fields_str = ', '.join(fields)
                    placeholders = ', '.join(['?'] * len(values))
                    
                    insert_query = f"""
                        INSERT OR REPLACE INTO version_data (version_id, {fields_str})
                        VALUES (?, {placeholders})
                    """
                    
                    cursor.execute(insert_query, [target_version_id] + values)
                    logger.info(f"Copied {len(fields)} fields from base image")
            
            # 2. Copy phone numbers
            cursor.execute("""
                INSERT INTO version_phone_numbers (version_id, phone_number)
                SELECT ?, phone_number
                FROM version_phone_numbers
                WHERE version_id = ?
            """, (target_version_id, source_version_id))
            copied_phones = cursor.rowcount
            
            # If no phone numbers in the source version, copy from base image
            if copied_phones == 0:
                cursor.execute("""
                    INSERT INTO version_phone_numbers (version_id, phone_number)
                    SELECT ?, phone_number
                    FROM phone_numbers
                    WHERE image_id = ?
                """, (target_version_id, image_id))
                copied_phones = cursor.rowcount
                
            logger.info(f"Copied {copied_phones} phone numbers")
            
            # 3. Copy email addresses
            cursor.execute("""
                INSERT INTO version_email_addresses (version_id, email_address)
                SELECT ?, email_address
                FROM version_email_addresses
                WHERE version_id = ?
            """, (target_version_id, source_version_id))
            copied_emails = cursor.rowcount
            
            # If no emails in the source version, copy from base image
            if copied_emails == 0:
                cursor.execute("""
                    INSERT INTO version_email_addresses (version_id, email_address)
                    SELECT ?, email_address
                    FROM email_addresses
                    WHERE image_id = ?
                """, (target_version_id, image_id))
                copied_emails = cursor.rowcount
                
            logger.info(f"Copied {copied_emails} email addresses")
            
            # 4. Copy postal addresses
            cursor.execute("""
                INSERT INTO version_postal_addresses 
                (version_id, street, sub_locality, city, sub_administrative_area, 
                state, postal_code, country, iso_country_code)
                SELECT ?, street, sub_locality, city, sub_administrative_area, 
                    state, postal_code, country, iso_country_code
                FROM version_postal_addresses
                WHERE version_id = ?
            """, (target_version_id, source_version_id))
            copied_addresses = cursor.rowcount
            
            # If no addresses in the source version, copy from base image
            if copied_addresses == 0:
                cursor.execute("""
                    INSERT INTO version_postal_addresses 
                    (version_id, street, sub_locality, city, sub_administrative_area, 
                    state, postal_code, country, iso_country_code)
                    SELECT ?, street, sub_locality, city, sub_administrative_area, 
                        state, postal_code, country, iso_country_code
                    FROM postal_addresses
                    WHERE image_id = ?
                """, (target_version_id, image_id))
                copied_addresses = cursor.rowcount
                
            logger.info(f"Copied {copied_addresses} postal addresses")
            
            # 5. Copy URL addresses
            cursor.execute("""
                INSERT INTO version_url_addresses (version_id, url)
                SELECT ?, url
                FROM version_url_addresses
                WHERE version_id = ?
            """, (target_version_id, source_version_id))
            copied_urls = cursor.rowcount
            
            # If no URLs in the source version, copy from base image
            if copied_urls == 0:
                cursor.execute("""
                    INSERT INTO version_url_addresses (version_id, url)
                    SELECT ?, url
                    FROM url_addresses
                    WHERE image_id = ?
                """, (target_version_id, image_id))
                copied_urls = cursor.rowcount
                
            logger.info(f"Copied {copied_urls} URL addresses")
            
            # 6. Copy social profiles
            cursor.execute("""
                INSERT INTO version_social_profiles (version_id, service, url, username)
                SELECT ?, service, url, username
                FROM version_social_profiles
                WHERE version_id = ?
            """, (target_version_id, source_version_id))
            copied_profiles = cursor.rowcount
            
            # If no profiles in the source version, copy from base image
            if copied_profiles == 0:
                cursor.execute("""
                    INSERT INTO version_social_profiles (version_id, service, url, username)
                    SELECT ?, service, url, username
                    FROM social_profiles
                    WHERE image_id = ?
                """, (target_version_id, image_id))
                copied_profiles = cursor.rowcount
                
            logger.info(f"Copied {copied_profiles} social profiles")
            
            logger.info(f"Successfully copied all data from version {source_version_id} to version {target_version_id}")
            
        except Exception as e:
            logger.error(f"Error copying version data: {e}", exc_info=True)
            raise

    def update_version(self, version_id: int, update_data: Dict[str, Any]) -> bool:
        """
        Update a specific version with new data.
        
        Args:
            version_id: ID of the version to update
            update_data: Dictionary of fields to update
            
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info(f"Updating version {version_id} with data: {update_data}")
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Verify version exists
                cursor.execute("SELECT id FROM image_versions WHERE id = ?", (version_id,))
                if not cursor.fetchone():
                    logger.error(f"Version ID {version_id} not found")
                    return False
                
                # Update main version data
                main_fields = [
                    'name_prefix', 'given_name', 'middle_name', 'family_name',
                    'name_suffix', 'job_title', 'department', 'organization_name'
                ]
                
                # Filter fields from update_data
                version_update_fields = {k: v for k, v in update_data.items() if k in main_fields}
                
                if version_update_fields:
                    logger.info(f"Updating main fields for version {version_id}: {version_update_fields}")
                    # Check if record exists
                    cursor.execute("SELECT version_id FROM version_data WHERE version_id = ?", (version_id,))
                    if cursor.fetchone():
                        # Update existing record
                        set_clause = ", ".join(f"{k} = ?" for k in version_update_fields.keys())
                        query = f"UPDATE version_data SET {set_clause} WHERE version_id = ?"
                        cursor.execute(query, list(version_update_fields.values()) + [version_id])
                    else:
                        # Create new record
                        fields = version_update_fields.keys()
                        placeholders = ", ".join(["?"] * (len(fields) + 1))  # +1 for version_id
                        query = f"INSERT INTO version_data (version_id, {', '.join(fields)}) VALUES ({placeholders})"
                        cursor.execute(query, [version_id] + list(version_update_fields.values()))
                
                # Update phone numbers
                if 'phone_numbers' in update_data:
                    logger.info(f"Updating phone numbers for version {version_id}")
                    cursor.execute("DELETE FROM version_phone_numbers WHERE version_id = ?", (version_id,))
                    for phone in (update_data['phone_numbers'] or []):
                        if phone and phone.strip():
                            cursor.execute(
                                "INSERT INTO version_phone_numbers (version_id, phone_number) VALUES (?, ?)",
                                (version_id, phone.strip())
                            )
                
                # Update email addresses
                if 'email_addresses' in update_data:
                    logger.info(f"Updating email addresses for version {version_id}")
                    cursor.execute("DELETE FROM version_email_addresses WHERE version_id = ?", (version_id,))
                    for email in (update_data['email_addresses'] or []):
                        if email and email.strip():
                            cursor.execute(
                                "INSERT INTO version_email_addresses (version_id, email_address) VALUES (?, ?)",
                                (version_id, email.strip())
                            )
                
                # Update postal addresses
                if 'postal_addresses' in update_data:
                    logger.info(f"Updating postal addresses for version {version_id}")
                    cursor.execute("DELETE FROM version_postal_addresses WHERE version_id = ?", (version_id,))
                    
                    # Make sure we have a list
                    postal_addresses = update_data['postal_addresses'] or []
                    if not isinstance(postal_addresses, list):
                        postal_addresses = []
                    
                    for addr in postal_addresses:
                        # Skip if not a dictionary
                        if not isinstance(addr, dict):
                            continue
                            
                        # Skip empty addresses
                        if not any(value for key, value in addr.items() if key not in ['id', 'version_id'] and value):
                            continue
                        
                        # Prepare values with defaults to avoid None/null issues
                        street = addr.get('street', '')
                        sub_locality = addr.get('sub_locality', '')
                        city = addr.get('city', '')
                        sub_administrative_area = addr.get('sub_administrative_area', '')
                        state = addr.get('state', '')
                        postal_code = addr.get('postal_code', '')
                        country = addr.get('country', '')
                        iso_country_code = addr.get('iso_country_code', '')
                        
                        cursor.execute("""
                            INSERT INTO version_postal_addresses (
                                version_id, street, sub_locality, city,
                                sub_administrative_area, state, postal_code,
                                country, iso_country_code
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            version_id, street, sub_locality, city,
                            sub_administrative_area, state, postal_code,
                            country, iso_country_code
                        ))
                
                # Update URL addresses
                if 'url_addresses' in update_data:
                    logger.info(f"Updating URL addresses for version {version_id}")
                    cursor.execute("DELETE FROM version_url_addresses WHERE version_id = ?", (version_id,))
                    for url in (update_data['url_addresses'] or []):
                        if url and url.strip():
                            cursor.execute(
                                "INSERT INTO version_url_addresses (version_id, url) VALUES (?, ?)",
                                (version_id, url.strip())
                            )
                
                # Update social profiles
                if 'social_profiles' in update_data:
                    logger.info(f"Updating social profiles for version {version_id}")
                    
                    # Delete existing profiles first
                    cursor.execute("DELETE FROM version_social_profiles WHERE version_id = ?", (version_id,))
                    
                    # Get profiles array, handling None/null
                    profiles = update_data.get('social_profiles') or []
                    
                    # Ensure it's a list
                    if not isinstance(profiles, list):
                        logger.warning(f"Expected list for social_profiles, got {type(profiles)}")
                        profiles = []
                    
                    # Process each profile
                    for profile in profiles:
                        if not isinstance(profile, dict):
                            logger.warning(f"Skipping non-dict profile: {profile}")
                            continue
                        
                        # Use get() with defaults to handle missing fields
                        service = profile.get('service', '')
                        url = profile.get('url', '')
                        username = profile.get('username', '') 
                        
                        # Log the insertion for debugging
                        logger.info(f"Inserting profile: service='{service}', url='{url}', username='{username}'")
                        
                        try:
                            # Use parameterized query for safety
                            cursor.execute("""
                                INSERT INTO version_social_profiles (version_id, service, url, username)
                                VALUES (?, ?, ?, ?)
                            """, (version_id, service, url, username))
                        except Exception as e:
                            logger.error(f"Error inserting profile: {e}")
                    
                    # Verify profiles were inserted
                    cursor.execute("SELECT COUNT(*) FROM version_social_profiles WHERE version_id = ?", (version_id,))
                    count = cursor.fetchone()[0]
                    logger.info(f"Inserted {count} profiles for version {version_id}")

                # Update version metadata if provided
                metadata_fields = {
                    k: v for k, v in update_data.items() 
                    if k in ['tag', 'notes', 'is_active']
                }
                
                if metadata_fields:
                    logger.info(f"Updating version metadata for version {version_id}: {metadata_fields}")
                    set_clause = ", ".join(f"{k} = ?" for k in metadata_fields.keys())
                    query = f"UPDATE image_versions SET {set_clause} WHERE id = ?"
                    cursor.execute(query, list(metadata_fields.values()) + [version_id])
                    
                    # If setting this version as active, deactivate others
                    if metadata_fields.get('is_active'):
                        # Get the image_id for this version
                        cursor.execute("SELECT image_id FROM image_versions WHERE id = ?", (version_id,))
                        image_id = cursor.fetchone()[0]
                        
                        # Deactivate other versions
                        cursor.execute("""
                            UPDATE image_versions
                            SET is_active = FALSE
                            WHERE image_id = ? AND id != ?
                        """, (image_id, version_id))
                
                return True
        except Exception as e:
            logger.error(f"Error updating version: {e}")
            return False

    def get_version_metadata(self, version_id: int) -> Dict[str, Any]:
        """Get metadata for a specific version if it exists.
        
        Args:
            version_id: ID of the version
            
        Returns:
            Dictionary with metadata or empty dict if none exists
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT * FROM version_metadata 
                    WHERE version_id = ?
                """, (version_id,))
                
                result = cursor.fetchone()
                if result:
                    return dict(result)
                return {}
                
        except Exception as e:
            logger.error(f"Error retrieving version metadata: {e}")
            return {}

    # Also modify get_image_versions to include metadata
    def get_image_versions(self, image_id: int) -> list:
        """Get all versions for a specific image with their metadata."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # Verify image exists
                cursor.execute("SELECT id FROM images WHERE id = ?", (image_id,))
                if not cursor.fetchone():
                    logger.error(f"Image ID {image_id} not found")
                    return []
                
                # Get version metadata with LEFT JOIN to include versions without metadata
                cursor.execute("""
                    SELECT v.*, m.model_id, m.program_id, m.program_name, 
                        m.program_version, m.provider, m.base_model, 
                        m.execution_id, m.extracted_at
                    FROM image_versions v
                    LEFT JOIN version_metadata m ON v.id = m.version_id
                    WHERE v.image_id = ?
                    ORDER BY v.created_at DESC
                """, (image_id,))
                
                versions = []
                for version_row in cursor.fetchall():
                    version_id = version_row['id']
                    version_data = dict(version_row)
                    
                    # Get main data
                    cursor.execute("SELECT * FROM version_data WHERE version_id = ?", (version_id,))
                    main_data = cursor.fetchone()
                    if main_data:
                        for key in main_data.keys():
                            if key != 'version_id':  # Skip the foreign key
                                version_data[key] = main_data[key]
                    
                    # Get related data (phone numbers, emails, etc.)
                    # ... (existing code for getting related data)
                    
                    # Get phone numbers
                    cursor.execute("SELECT phone_number FROM version_phone_numbers WHERE version_id = ?", (version_id,))
                    version_data['phone_numbers'] = [r[0] for r in cursor.fetchall()]
                    
                    # Get email addresses
                    cursor.execute("SELECT email_address FROM version_email_addresses WHERE version_id = ?", (version_id,))
                    version_data['email_addresses'] = [r[0] for r in cursor.fetchall()]
                    
                    # Get postal addresses
                    cursor.execute("SELECT * FROM version_postal_addresses WHERE version_id = ?", (version_id,))
                    postal_rows = cursor.fetchall()
                    postal_addresses = []
                    
                    for row in postal_rows:
                        addr = {}
                        for key in row.keys():
                            if key not in ['id', 'version_id']:  # Skip these fields
                                addr[key] = row[key]
                        postal_addresses.append(addr)
                    
                    version_data['postal_addresses'] = postal_addresses
                    
                    # Get URL addresses
                    cursor.execute("SELECT url FROM version_url_addresses WHERE version_id = ?", (version_id,))
                    version_data['url_addresses'] = [r[0] for r in cursor.fetchall()]
                    
                    # Get social profiles
                    version_data['social_profiles'] = self._load_version_social_profiles(conn, version_id)
                    
                    versions.append(version_data)
                    
                return versions
        except Exception as e:
            logger.error(f"Error getting versions: {e}")
            return []

    def get_version(self, version_id: int) -> Dict[str, Any]:
        """
        Get a specific version with all its data.
        
        Args:
            version_id: ID of the version
            
        Returns:
            Version data as a dictionary
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # Get version metadata
                cursor.execute("SELECT * FROM image_versions WHERE id = ?", (version_id,))
                version_row = cursor.fetchone()
                
                if not version_row:
                    logger.error(f"Version ID {version_id} not found")
                    return {}
                
                version_data = dict(version_row)
                
                # Get main data
                cursor.execute("SELECT * FROM version_data WHERE version_id = ?", (version_id,))
                main_data = cursor.fetchone()
                if main_data:
                    for key in main_data.keys():
                        if key != 'version_id':  # Skip the foreign key
                            version_data[key] = main_data[key]
                
                # Get phone numbers
                cursor.execute("SELECT phone_number FROM version_phone_numbers WHERE version_id = ?", (version_id,))
                version_data['phone_numbers'] = [r[0] for r in cursor.fetchall()]
                
                # Get email addresses
                cursor.execute("SELECT email_address FROM version_email_addresses WHERE version_id = ?", (version_id,))
                version_data['email_addresses'] = [r[0] for r in cursor.fetchall()]
                
                # Get postal addresses
                cursor.execute("SELECT * FROM version_postal_addresses WHERE version_id = ?", (version_id,))
                postal_rows = cursor.fetchall()
                postal_addresses = []
                
                for row in postal_rows:
                    addr = {}
                    for key in row.keys():
                        if key not in ['id', 'version_id']:  # Skip these fields
                            addr[key] = row[key]
                    postal_addresses.append(addr)
                
                version_data['postal_addresses'] = postal_addresses
                
                # Get URL addresses
                cursor.execute("SELECT url FROM version_url_addresses WHERE version_id = ?", (version_id,))
                version_data['url_addresses'] = [r[0] for r in cursor.fetchall()]
                
                # Get social profiles
                cursor.execute("SELECT service, url, username FROM version_social_profiles WHERE version_id = ?", (version_id,))
                social_profiles = []
                
                for row in cursor.fetchall():
                    profile = {
                        'service': row[0], 
                        'url': row[1], 
                        'username': row[2]
                    }
                    social_profiles.append(profile)
                
                version_data['social_profiles'] = social_profiles
                
                return version_data
        except Exception as e:
            logger.error(f"Error getting version: {e}")
            return {}

    def set_active_version(self, version_id: int) -> bool:
        """
        Set a version as active and deactivate others for the same image.
        
        Args:
            version_id: ID of the version to set as active
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get the image_id for this version
                cursor.execute("SELECT image_id FROM image_versions WHERE id = ?", (version_id,))
                result = cursor.fetchone()
                
                if not result:
                    logger.error(f"Version ID {version_id} not found")
                    return False
                    
                image_id = result[0]
                
                # Set this version as active
                cursor.execute("UPDATE image_versions SET is_active = TRUE WHERE id = ?", (version_id,))
                
                # Deactivate other versions for this image
                cursor.execute("""
                    UPDATE image_versions
                    SET is_active = FALSE
                    WHERE image_id = ? AND id != ?
                """, (image_id, version_id))
                
                return True
        except Exception as e:
            logger.error(f"Error setting active version: {e}")
            return False
        
    async def extract_contact_info(self, image_id: int) -> dict:
        """Extract contact information from an image using the LLM server."""
        try:
            logger.info(f"Starting extraction for image_id: {image_id}")
            
            # Get the image file path from the database
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT file_path, filename FROM images WHERE id = ?", (image_id,))
                result = cursor.fetchone()
                if not result:
                    logger.error(f"Image not found for id: {image_id}")
                    return {"success": False, "error": "Image not found"}
                
                file_path, filename = result
                logger.info(f"Found image with filename: {filename}")
                
                # Construct the absolute path to the image file
                abs_path = os.path.join(self.image_dir, file_path)
                
                if not os.path.exists(abs_path):
                    logger.error(f"Image file not found at path: {abs_path}")
                    return {"success": False, "error": "Image file not found on disk"}
                
                # Read the file content
                with open(abs_path, 'rb') as f:
                    image_data = f.read()
                    
            # Convert image data to base64
            base64_image = base64.b64encode(image_data).decode('utf-8')
            logger.info("Successfully converted image to base64")
            
            # Prepare the request body
            request_body = {
                "request": {    
                    "pipeline_id": "extract-contact",
                    "content": base64_image,
                    "media_type": "image",
                    "params": {
                        "model_id": "gpt-4o-mini"
                    }
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
                        logger.error(f"HTTP error response: {error_text}")
                        return {"success": False, "error": f"LLM server HTTP error {response.status}: {error_text}"}
                    
                    raw_response = await response.json()
                    logger.info(f"Raw server response: {raw_response}")
                    
                    try:
                        server_response = ServerResponse[ContactInfo].model_validate(raw_response)
                        logger.info("Successfully validated server response")
                        
                        if not server_response.success:
                            error_msg = server_response.error or 'Unknown error'
                            logger.error(f"Server indicated failure: {error_msg}")
                            return {"success": False, "error": f"LLM server error: {error_msg}"}
                        
                        contact_info = server_response.data
                        
                        # Extract metadata for versioning
                        metadata = {}
                        if hasattr(raw_response, 'metadata'):
                            metadata = raw_response.get('metadata', {})
                        elif 'metadata' in raw_response:
                            metadata = raw_response['metadata']
                        
                        # Extract execution metadata from the nested structure if available
                        execution_info = {}
                        if hasattr(contact_info, 'metadata') and hasattr(contact_info.metadata, 'execution_info'):
                            execution_info = contact_info.metadata.execution_info
                        elif isinstance(contact_info, dict) and 'metadata' in contact_info:
                            execution_info = contact_info['metadata'].get('execution_info', {})
                        
                        # Combine all metadata sources
                        all_metadata = {**metadata, **execution_info}
                        
                        # Extract key fields for versioning
                        model_id = all_metadata.get('model_id', 'unknown-model')
                        program_id = all_metadata.get('program_id', 'unknown-program')
                        program_version = all_metadata.get('program_version', '0.0.0')
                        program_name = all_metadata.get('program_name', 'Contact Extractor')
                        execution_id = all_metadata.get('execution_id', '')
                        timestamp = all_metadata.get('timestamp', datetime.now().isoformat())
                        
                        # Model provider details
                        model_info = all_metadata.get('model_info', {})
                        provider = model_info.get('provider', '')
                        base_model = model_info.get('base_model', '')
                        
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
                                # Map each PostalAddress object to a dictionary
                                address_dict = {
                                    'street': addr.street,
                                    'city': addr.city,
                                    'sub_locality': '',
                                    'sub_administrative_area': '',
                                    'state': addr.state,
                                    'postal_code': addr.postal_code,
                                    'country': addr.country,
                                    'iso_country_code': ''
                                }
                                mapped_info["postal_addresses"].append(address_dict)
                        
                        logger.info("Successfully mapped contact info to database structure")
                        
                        # Update the database with extracted information
                        logger.info("Updating database with mapped info")
                        update_success = self.update_image(image_id, mapped_info)
                        
                        if not update_success:
                            logger.warning("Failed to update image with extracted data")
                            return {"success": False, "error": "Failed to update image with extracted data"}
                        
                        try:
                            # Create a version tag based on model and program version
                            base_tag = f"extracted_{model_id}_v{program_version}"
                            
                            # Check for existing versions with similar tags to handle duplicates
                            with sqlite3.connect(self.db_path) as conn:
                                cursor = conn.cursor()
                                cursor.execute("""
                                    SELECT tag FROM image_versions
                                    WHERE image_id = ? AND tag LIKE ?
                                    ORDER BY tag
                                """, (image_id, f"{base_tag}%"))
                                
                                existing_tags = [row[0] for row in cursor.fetchall()]
                                
                                # Handle duplicates with sequential numbering
                                if existing_tags:
                                    # Find the highest number suffix
                                    highest_num = 0
                                    for tag in existing_tags:
                                        if tag == base_tag:
                                            highest_num = max(highest_num, 1)
                                        elif tag.startswith(f"{base_tag}-"):
                                            try:
                                                suffix = tag.split("-")[-1]
                                                if suffix.isdigit():
                                                    highest_num = max(highest_num, int(suffix))
                                            except (IndexError, ValueError):
                                                pass
                                    
                                    # Create new tag with incremented suffix
                                    if highest_num > 0:
                                        tag = f"{base_tag}-{highest_num + 1}"
                                    else:
                                        tag = base_tag
                                else:
                                    tag = base_tag
                            
                            # Create notes with detailed information
                            notes = f"""
    Extracted using {program_name} v{program_version}
    Model: {model_id} ({provider}/{base_model})
    Execution ID: {execution_id}
    Timestamp: {timestamp}
                            """.strip()
                            
                            # Create the version 
                            version_id = await self.create_version(
                                image_id=image_id,
                                tag=tag,
                                notes=notes
                            )
                            
                            # Store metadata in the new metadata table
                            with sqlite3.connect(self.db_path) as conn:
                                cursor = conn.cursor()
                                cursor.execute("""
                                    INSERT INTO version_metadata (
                                        version_id, model_id, program_id, program_name, 
                                        program_version, provider, base_model, execution_id, 
                                        extracted_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """, (
                                    version_id, model_id, program_id, program_name,
                                    program_version, provider, base_model, execution_id,
                                    datetime.now()
                                ))
                            
                            # Update the new version with extracted data
                            version_success = self.update_version(version_id, mapped_info)
                            if not version_success:
                                logger.warning("Failed to update version with extracted data")
                            
                            logger.info(f"Successfully created version {version_id} with metadata")
                            
                        except Exception as version_error:
                            # Log version creation error but don't fail the whole operation
                            logger.error(f"Error creating version: {version_error}", exc_info=True)
                        
                        # Return success with data
                        return {"success": True, "data": mapped_info}
                        
                    except Exception as validation_error:
                        logger.error(f"Validation error: {validation_error}", exc_info=True)
                        return {"success": False, "error": f"Failed to parse server response: {validation_error}"}
                        
        except Exception as e:
            logger.error(f"Error extracting contact info: {e}", exc_info=True)
            return {"success": False, "error": f"Contact extraction failed: {str(e)}"}
      
    def delete_image(self, image_id: int) -> OperationResult:
        """Delete an image and all associated data including the file on disk"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # First, get the file path before deleting the image record
                cursor.execute("SELECT file_path FROM images WHERE id = ?", (image_id,))
                result = cursor.fetchone()
                
                if not result:
                    return OperationResult.not_found(f"Image ID {image_id} not found")
                
                file_path = result['file_path']
                if file_path:
                    # Construct the absolute path to the image file
                    abs_path = os.path.join(self.image_dir, file_path)
                    logger.info(f"Found image file to delete: {abs_path}")
                
                # Get all version IDs for this image
                cursor.execute("SELECT id FROM image_versions WHERE image_id = ?", (image_id,))
                version_ids = [row['id'] for row in cursor.fetchall()]
                
                # Delete all associated data
                for version_id in version_ids:
                    self._delete_version_data(conn, version_id)
                self._delete_image_data(conn, image_id)
                
                # Now delete the file from disk after database operations succeeded
                if file_path and os.path.exists(abs_path):
                    try:
                        os.remove(abs_path)
                        logger.info(f"Deleted image file: {abs_path}")
                        
                        # Optionally cleanup empty directories
                        self._cleanup_empty_dirs(os.path.dirname(abs_path))
                    except Exception as file_error:
                        # Log but don't fail the operation if file deletion fails
                        logger.warning(f"Failed to delete image file {abs_path}: {file_error}")
                
                logger.info(f"Deleted image {image_id} with {len(version_ids)} versions")
                return OperationResult.success()
                    
        except Exception as e:
            logger.error(f"Error deleting image: {e}", exc_info=True)
            return OperationResult.error("database_error", str(e))

    def _cleanup_empty_dirs(self, directory_path):
        """Helper method to remove empty directories after file deletion"""
        try:
            # Don't delete the base image directory
            if directory_path == self.image_dir or not os.path.exists(directory_path):
                return
                
            # Check if directory is empty
            if not os.listdir(directory_path):
                logger.info(f"Removing empty directory: {directory_path}")
                os.rmdir(directory_path)
                
                # Recursively check parent directories
                parent_dir = os.path.dirname(directory_path)
                if parent_dir != self.image_dir:
                    self._cleanup_empty_dirs(parent_dir)
        except Exception as e:
            logger.warning(f"Error cleaning up directory {directory_path}: {e}")
        
    def delete_version(self, version_id: int) -> OperationResult:
        """Delete a version and all its data"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # Get version info
                cursor.execute("SELECT id, image_id, is_active FROM image_versions WHERE id = ?", (version_id,))
                version = cursor.fetchone()
                if not version:
                    return OperationResult.not_found(f"Version {version_id} not found")
                
                # Check if this is the only version
                cursor.execute(
                    "SELECT COUNT(*) as count FROM image_versions WHERE image_id = ?", 
                    (version['image_id'],)
                )
                if cursor.fetchone()['count'] <= 1:
                    return OperationResult.error(
                        "only_version", 
                        f"Cannot delete the only version for image {version['image_id']}"
                    )
                
                # Delete the version data
                self._delete_version_data(conn, version_id)
                
                # Set new active version if needed
                if version['is_active']:
                    self._set_new_active_version(conn, version['image_id'])
                
                return OperationResult.success()
                    
        except Exception as e:
            logger.error(f"Error deleting version: {e}", exc_info=True)
            return OperationResult.error("database_error", str(e))

    def _delete_version_data(self, conn, version_id: int) -> None:
        """Delete all data for a version"""
        cursor = conn.cursor()
        
        # Delete from relation tables with version_id foreign key
        cursor.execute("DELETE FROM version_phone_numbers WHERE version_id = ?", (version_id,))
        cursor.execute("DELETE FROM version_email_addresses WHERE version_id = ?", (version_id,))
        cursor.execute("DELETE FROM version_postal_addresses WHERE version_id = ?", (version_id,))
        cursor.execute("DELETE FROM version_url_addresses WHERE version_id = ?", (version_id,))
        cursor.execute("DELETE FROM version_social_profiles WHERE version_id = ?", (version_id,))

        
        # Delete from version_data table
        cursor.execute("DELETE FROM version_data WHERE version_id = ?", (version_id,))
        
        # Delete from version_metadata table
        cursor.execute("DELETE FROM version_metadata WHERE version_id = ?", (version_id,))
        
        # Finally delete the version itself
        cursor.execute("DELETE FROM image_versions WHERE id = ?", (version_id,))

    def _delete_image_data(self, conn, image_id: int) -> None:
        """Delete all data for an image"""
        cursor = conn.cursor()
        
        # Delete from relation tables with image_id foreign key
        cursor.execute("DELETE FROM phone_numbers WHERE image_id = ?", (image_id,))
        cursor.execute("DELETE FROM email_addresses WHERE image_id = ?", (image_id,))
        cursor.execute("DELETE FROM postal_addresses WHERE image_id = ?", (image_id,))
        cursor.execute("DELETE FROM url_addresses WHERE image_id = ?", (image_id,))
        cursor.execute("DELETE FROM social_profiles WHERE image_id = ?", (image_id,))
        
        # Finally delete the image itself
        cursor.execute("DELETE FROM images WHERE id = ?", (image_id,))
        
    def _set_new_active_version(self, conn, image_id: int) -> None:
        """Set the most recent version as active"""
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE image_versions 
            SET is_active = TRUE 
            WHERE id = (
                SELECT id FROM image_versions 
                WHERE image_id = ? 
                ORDER BY created_at DESC LIMIT 1
            )
        """, (image_id,))
        
    def _load_version_social_profiles(self, conn, version_id):
        """Helper function to load social profiles for a version"""
        try:
            cursor = conn.cursor()
            
            # Execute with explicit column names to ensure correct order
            query = """
                SELECT service, url, username 
                FROM version_social_profiles 
                WHERE version_id = ?
            """
            cursor.execute(query, (version_id,))
            
            rows = cursor.fetchall()
            logger.info(f"Found {len(rows)} social profiles for version {version_id}")
            
            profiles = []
            for row in rows:
                # If using column names, use dict(row) approach
                if isinstance(row, sqlite3.Row):
                    profile = {
                        'service': row['service'],
                        'url': row['url'],
                        'username': row['username']
                    }
                else:
                    # If using indices, ensure correct order in the SELECT statement
                    profile = {
                        'service': row[0],
                        'url': row[1],
                        'username': row[2]
                    }
                
                logger.info(f"Loaded profile: {profile}")
                profiles.append(profile)
            
            return profiles
        except Exception as e:
            logger.error(f"Error loading social profiles: {e}", exc_info=True)
            return []
    