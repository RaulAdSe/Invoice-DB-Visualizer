import axios from 'axios';

// Since we're using Cloud Run, we should use the direct backend URL
const API_BASE_URL = 'https://servitec-backend-62676166363.europe-southwest1.run.app';

console.log('API Service: Initializing with base URL:', API_BASE_URL);

// Export the api instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: false
});

export { api };

// Simplified request interceptor
api.interceptors.request.use(
  (config) => {
    // Don't modify URLs that are already absolute
    if (!config.url.startsWith('http')) {
      // Make sure we don't double-add /api
      if (!config.url.startsWith('/api/')) {
        config.url = `/api/${config.url.replace(/^\//, '')}`;
      }
    }
    
    console.log('Making request to:', {
      url: config.url,
      fullUrl: `${config.baseURL}${config.url}`,
      method: config.method,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Simplified response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response Success:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
);

// Modified API functions to ensure proper URL formatting
export const getProjects = async () => {
  console.log('Calling getProjects');
  try {
    const response = await api.get('/api/projects');
    console.log('getProjects response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getProjects failed:', error);
    throw error;
  }
};

export const getInvoices = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/api/invoices${queryString ? `?${queryString}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    throw error;
  }
};

export const getElements = async (invoiceId) => {
  try {
    const response = await api.get(`/api/elements/${invoiceId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch elements:', error);
    throw error;
  }
};

export const getSubelements = (elementId) =>
  api.get(`/api/subelements/${elementId}`);

export const downloadSelected = async (entityType, selectedIds) => {
  console.log('downloadSelected called with:', { entityType, selectedIds });
  
  try {
    console.log('Making API request to:', `/download_selected/${entityType}`);
    console.log('Request payload:', { selectedIds });
    
    const response = await api.post(
      `/download_selected/${entityType}`,
      { selectedIds },
      {
        responseType: 'blob',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Response received:', response);
    console.log('Response type:', response.data.type);
    console.log('Response size:', response.data.size);

    // Check if the response is an error message in JSON format
    if (response.data instanceof Blob && response.data.type === 'application/json') {
      console.log('Response is JSON blob, parsing...');
      const text = await response.data.text();
      console.log('Parsed response text:', text);
      const error = JSON.parse(text);
      throw new Error(error.error || 'Download failed');
    }

    return response;
  } catch (error) {
    console.error('Download error details:', {
      message: error.message,
      response: error.response,
      request: error.request,
      config: error.config
    });
    throw error;
  }
};

export const sendMessage = async (message) => {
  try {
    const response = await api.post('/chat', 
      { message },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
};

// Add a new function for handling downloads
export const downloadFile = async (url) => {
  try {
    // If the URL starts with /api, remove it since baseURL already includes it
    const cleanUrl = url.startsWith('/api') ? url.substring(4) : url;
    
    const response = await api.get(cleanUrl, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
    return response;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

// Enhanced error handler
api.interceptors.response.use(
  response => {
    console.log('API Response:', {
      url: response.config.url,
      method: response.config.method,
      status: response.status,
      headers: response.headers,
      data: response.data instanceof Blob ? 'Blob data' : response.data
    });
    return response;
  },
  error => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data
    });

    if (error.response?.data instanceof Blob) {
      console.log('Error response is a Blob, attempting to parse...');
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            console.log('Parsed blob content:', reader.result);
            error.response.data = JSON.parse(reader.result);
          } catch (e) {
            console.error('Failed to parse blob content:', e);
            error.response.data = { error: 'Failed to parse error response' };
          }
          reject(error);
        };
        reader.onerror = () => {
          console.error('Failed to read blob:', reader.error);
          reject(error);
        };
        reader.readAsText(error.response.data);
      });
    }
    return Promise.reject(error);
  }
);

export const downloadReport = async (reportUrl) => {
  try {
    console.log('Downloading report from:', reportUrl);
    
    const response = await api.get(reportUrl, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });

    console.log('Response received:', response);
    console.log('Response type:', response.data.type);
    console.log('Response size:', response.data.size);

    // Check if the response is an error message in JSON format
    if (response.data instanceof Blob && response.data.type === 'application/json') {
      console.log('Response is JSON blob, parsing...');
      const text = await response.data.text();
      console.log('Parsed response text:', text);
      const error = JSON.parse(text);
      throw new Error(error.error || 'Download failed');
    }

    return response;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

// Export everything properly
export default api;

export const testConnection = async () => {
  try {
    console.log('Testing backend connection...');
    const response = await api.get('/api/test');
    console.log('Backend test response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Backend test failed:', error);
    throw error;
  }
};