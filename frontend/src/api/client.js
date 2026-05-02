import axios from 'axios';

// base url comes from env file (set in .env)
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// create axios instance with the base url
const api = axios.create({
  baseURL: baseURL
});

// add token to every request automatically
api.interceptors.request.use(function (config) {
  const token = localStorage.getItem('ttm_token');
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

// if we get a 401, the token is bad - send user back to login
api.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('ttm_token');
        localStorage.removeItem('ttm_user');
        // small delay so user can see error
        setTimeout(function () {
          window.location.href = '/login';
        }, 300);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
