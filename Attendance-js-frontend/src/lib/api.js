import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    // Let the browser/Axios set the correct multipart boundary automatically
    delete config.headers['Content-Type'];
  } else {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const body = response.data;

    const looksWrapped =
      body &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      'success' in body &&
      'data' in body;

    if (looksWrapped) {
      response.data = body.data;
    }

    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
