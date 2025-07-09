import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Faculty APIs
export const facultyApi = {
  getAll: () => api.get('/faculty'),
  getById: (id: string) => api.get(`/faculty/${id}`),
  create: (data: any) => api.post('/faculty', data),
  update: (id: string, data: any) => api.put(`/faculty/${id}`, data),
  delete: (id: string) => api.delete(`/faculty/${id}`),
};

// Timetable APIs
export const timetableApi = {
  getAll: () => api.get('/timetable'),
  getById: (id: string) => api.get(`/timetable/${id}`),
  create: (data: any) => api.post('/timetable', data),
  update: (id: string, data: any) => api.put(`/timetable/${id}`, data),
  delete: (id: string) => api.delete(`/timetable/${id}`),
  getFacultyTimetables: (facultyId: string) => api.get(`/timetable/faculty/${facultyId}`),
  checkAvailability: (data: any) => api.post('/timetable/check-availability', data),
};

export default api; 