const API_BASE_URL = 'http://localhost:8000';

export const api = {
  // Database operations
  initializeDatabase: async (dbPath) => {
    const response = await fetch(`${API_BASE_URL}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ db_path: dbPath })
    });
    return handleResponse(response);
  },

  // Image operations
  fetchImages: async () => {
    const response = await fetch(`${API_BASE_URL}/images`);
    return handleResponse(response);
  },

  uploadImageUrl: async (url) => {
    const formData = new FormData();
    formData.append('url', url);
    const response = await fetch(`${API_BASE_URL}/upload/url`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  uploadImageFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/upload/file`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  updateImage: async (imageId, data) => {
    const response = await fetch(`${API_BASE_URL}/update/${imageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  extractContactInfo: async (imageId) => {
    const response = await fetch(`${API_BASE_URL}/extract/${imageId}`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  deleteImage: async (imageId) => {
    const response = await fetch(`${API_BASE_URL}/image/${imageId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  getStatus: async () => {
    const response = await fetch(`${API_BASE_URL}/status`);
    return handleResponse(response);
  },

  createVersion: async (imageId, data) => {
    const response = await fetch(`${API_BASE_URL}/version/${imageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  getVersions: async (imageId) => {
    const response = await fetch(`${API_BASE_URL}/versions/${imageId}`);
    return handleResponse(response);
  },
  
  updateVersion: async (versionId, data) => {
    const response = await fetch(`${API_BASE_URL}/version/${versionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  }
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'API request failed');
  }
  return response.json();
};

