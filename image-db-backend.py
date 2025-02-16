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

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DbPath(BaseModel):
    db_path: str

class ImageDatabase:
    def __init__(self, db_path):
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    source_url TEXT,
                    hash TEXT UNIQUE,
                    date_added TIMESTAMP,
                    image_data BLOB NOT NULL
                )
            """)

    async def save_image(self, image_data: bytes, source_url: str = None) -> bool:
        # Generate hash of image data
        image_hash = hashlib.sha256(image_data).hexdigest()
        
        try:
            # Validate image
            img = Image.open(BytesIO(image_data))
            img.verify()
            
            # Create filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"image_{timestamp}.{img.format.lower()}"
            
            with sqlite3.connect(self.db_path) as conn:
                try:
                    conn.execute("""
                        INSERT INTO images (filename, source_url, hash, date_added, image_data)
                        VALUES (?, ?, ?, ?, ?)
                    """, (filename, source_url, image_hash, datetime.now(), image_data))
                    return True
                except sqlite3.IntegrityError:
                    # Image already exists (hash collision)
                    return False
                
        except Exception as e:
            print(f"Error saving image: {e}")
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
                success = await image_db.save_image(image_data, url)
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
        cursor = conn.execute("""
            SELECT filename, date_added, source_url
            FROM images
            ORDER BY date_added DESC
        """)
        images = [
            {
                "filename": row[0],
                "date_added": row[1],
                "source_url": row[2]
            }
            for row in cursor.fetchall()
        ]
    return {"images": images}