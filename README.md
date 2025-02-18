# Image Collector

A simple tool for collecting and organizing images in a local database.

## Setup

1. Install dependencies:
```bash
# Frontend
npm install

# Backend
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
pip install fastapi uvicorn pillow aiofiles aiohttp
```

2. Start the backend:
```bash
# Activate virtual environment if not already activated
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate

# Start the FastAPI server
uvicorn image-db-backend:app --reload
```

3. Start the frontend in a separate terminal:
```bash
npm run dev
```

## Usage

1. Enter a path where you want to store your database (e.g., `images.db`)
2. Click "Connect"
3. Add images by:
   - Dragging and dropping image files
   - Pasting an image URL

The app will store your images along with basic metadata like date added and source URL.

## Features

- Store images locally in SQLite database
- Add images via drag-and-drop or URL
- View image collection with thumbnails
- Track image sources and dates
- Prevent duplicate images

## Development

Built with:
- Frontend: React + Vite + TailwindCSS 
- Backend: FastAPI + SQLite
- Image Processing: Pillow

## Troubleshooting

If you see no output after starting the backend server, make sure you're using `uvicorn` to run it:
```bash
uvicorn image-db-backend:app --reload
```

The server should display startup information and confirm it's running at http://127.0.0.1:8000.