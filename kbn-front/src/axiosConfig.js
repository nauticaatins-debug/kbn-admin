// src/axiosConfig.js
import axios from 'axios';

const getToken = () => {
    return localStorage.getItem('token');
};

// Crear una instancia de Axios con la configuración base
const instance = axios.create({
  baseURL: 'https://kbn-admin-production.up.railway.app', // URL base del backend de Spring Boot
});

// Agregar un interceptor para las solicitudes
instance.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default instance;
