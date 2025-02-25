# Contact Info Card Collector

A full-stack application for scanning, storing, and organizing contact info images in a local database with contact information extraction capabilities.

## Features

- **Database Management**
  - Store contact info card images locally in SQLite database
  - Connection persistence between sessions
  - Comprehensive data model for contact information

- **Image Collection**
  - Add images via drag-and-drop
  - Import images from URLs
  - Automatic thumbnail generation
  - Duplicate prevention using image hashing

- **Contact Information Management**
  - AI-powered contact information extraction
  - Store structured contact details:
    - Name (prefix, given name, middle name, family name, suffix)
    - Work information (job title, department, organization)
    - Contact details (email addresses, phone numbers)
    - Web presence (URLs, social profiles)
  - Edit all fields manually with validation

- **User Interface**
  - Clean, responsive design with Tailwind CSS
  - Dark mode interface
  - Image previews
  - Tabular data display with inline editing
  - Status notifications for operations

## Tech Stack

- **Frontend:**
  - React + Vite
  - TailwindCSS
  - Context API for state management
  - Custom hooks for business logic

- **Backend:**
  - FastAPI (Python)
  - SQLite database
  - Pillow for image processing
  - External AI service integration for contact extraction

## Setup

### Prerequisites
- npm (for package management)
- Python (v3.9+)
- pip

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/contact-info-collector.git
cd contact-info-collector
```

2. Install backend dependencies:
```
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate

# Install required packages
pip install fastapi uvicorn pillow python-dotenv aiohttp
```

3. Install frontend dependencies:
`npm install`

4. Set up environment variables:
```
# Create a .env file in the root directory with your API key for contact extraction
echo "LLM_SERVER_API_KEY=your_api_key_here" > .env
```

### Running the Application

1. Start the backend server:
```
# Make sure your virtual environment is activated
uvicorn image_db.main:app --reload
```

2. Start the frontend development server in a separate terminal:
`npm run dev`

3. Open your browser and navigate to the URL shown in the terminal (typically http://localhost:5173)

## Usage

1. Connect to a database:
   - Enter a path where you want to store your database (e.g., `~/my_cards.db`)
   - Click "Connect"

2. Add contact info card images:
   - Drag and drop image files onto the drop zone
   - Or paste an image URL and click "Add URL"

3. Extract contact information:
   - Select "Edit All" to enable editing
   - Click "Extract Contact Info" on a card to use AI for automatic extraction
   - Edit any fields manually as needed
   - Click "Save Changes" when done

4. Manage your database:
   - View all stored cards with their extracted information
   - Delete entries you no longer need
   - Edit contact details at any time

## Development

### Project Structure
```
contact-info-collector/
├── image_db/                # Backend Python package
│   ├── api.py               # FastAPI routes
│   ├── database.py          # Database operations
│   ├── main.py              # FastAPI application
│   ├── models.py            # Pydantic models
│   └── utils.py             # Utility functions
│
├── src/                     # Frontend React application
│   ├── components/          # UI components
│   ├── context/             # React Context providers
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API service layer
│   └── utils/               # Utility functions
│
├── package.json             # Frontend dependencies
└── README.md                # This documentation

### Building for Production

```
# Build the frontend
npm run build

# Deploy the backend (example using uvicorn)
pip install uvicorn
uvicorn image_db.main:app --reload
```

## Troubleshooting

- **Database Connection Issues**
  - Ensure the path you entered is valid and the directory exists
  - Check that the application has write permissions to the specified location

- **Contact Extraction Not Working**
  - Verify your API key is correctly set in the .env file
  - Ensure your internet connection is active

- **Image Upload Failures**
  - Check that your images are in a supported format (JPEG, PNG, GIF)
  - Verify the file size is reasonable (under 10MB)

## License

[MIT License](LICENSE)

## Acknowledgements

- This project uses [FastAPI](https://fastapi.tiangolo.com/) for the backend API
- UI built with [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- Image processing with [Pillow](https://python-pillow.org/)