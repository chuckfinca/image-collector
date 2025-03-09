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
  },
  
  deleteVersion: async (versionId) => {
    const response = await fetch(`${API_BASE_URL}/version/${versionId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  }
};

const handleResponse = async (response) => {
  let responseText = '';
  
  try {
    // First, get the raw text for logging purposes
    responseText = await response.text();
    console.log(`API Response (${response.status}):`, responseText);
    
    // Then parse as JSON if possible
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // If not JSON, use the text directly
      data = { detail: responseText || 'No response content' };
    }
    
    // Handle error responses
    if (!response.ok) {
      const errorMessage = data.detail || `API request failed with status ${response.status}`;
      console.error('API Error:', errorMessage);
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    // If this is already our custom error with the message set, just rethrow
    if (error.message !== 'Failed to execute \'text\' on \'Response\'') {
      throw error;
    }
    
    // Otherwise it's likely an error in the response handling itself
    console.error('Error handling response:', error);
    throw new Error(`Failed to process response: ${error.message}`);
  }
};
