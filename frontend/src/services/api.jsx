import axios from 'axios';

// FIX #12: Use environment variable for production, fallback to localhost for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

// ==================== PARTICIPANT ====================
export const participantAPI = {
  getProfile: () => api.get('/participant/profile'),
  updateProfile: (data) => api.put('/participant/profile', data),
  changePassword: (data) => api.put('/participant/change-password', data),
  getMyEvents: () => api.get('/participant/my-events'),
  getClubs: () => api.get('/participant/clubs'),
  getClubDetails: (id) => api.get(`/participant/clubs/${id}`),
  followClub: (clubId) => api.post(`/participant/follow/${clubId}`),
  browseEvents: (params) => api.get('/participant/events/browse', { params }),
  getTrendingEvents: () => api.get('/participant/events/trending'),
  getEventById: (eventId) => api.get(`/participant/events/${eventId}`),
  registerForEvent: (eventId, data) => api.post(`/participant/events/${eventId}/register`, data),
  cancelRegistration: (eventId) => api.delete(`/participant/events/${eventId}/register`),
  getTicket: (ticketId) => api.get(`/participant/ticket/${ticketId}`),
  saveInterests: (interests) => api.post('/user/interests', { interests })
};

// ==================== TEAMS ====================
export const teamAPI = {
  createTeam: (data) => api.post('/participant/teams/create', data),
  joinTeam: (data) => api.post('/participant/teams/join', data),
  deleteTeam: (teamId) => api.delete(`/participant/teams/${teamId}`),
  getMyTeam: (eventId) => api.get('/participant/teams/my', { params: { eventId } }),
  previewTeam: (inviteCode) => api.get(`/participant/teams/preview/${inviteCode}`),
  getEventTeams: (eventId) => api.get(`/participant/teams/event/${eventId}`),
  getMessages: (teamId) => api.get(`/participant/teams/${teamId}/chat`),
  sendMessage: (teamId, data) => api.post(`/participant/teams/${teamId}/chat`, data)
};

// ==================== ORGANIZER ====================
export const organizerAPI = {
  getProfile: () => api.get('/organizer/profile'),
  updateProfile: (data) => api.put('/organizer/profile', data),
  changePassword: (data) => api.put('/organizer/change-password', data),
  getStats: () => api.get('/organizer/stats'),
  getEvents: () => api.get('/organizer/events'),
  createEvent: (data) => api.post('/organizer/events', data),
  getEvent: (id) => api.get(`/organizer/events/${id}`),
  updateEvent: (id, data) => api.put(`/organizer/events/${id}`, data),
  publishEvent: (id) => api.patch(`/organizer/events/${id}/publish`),
  deleteEvent: (id) => api.delete(`/organizer/events/${id}`),
  scanAttendance: (id, data) => api.post(`/organizer/events/${id}/attendance/scan`, data),
  overrideAttendance: (id, data) => api.post(`/organizer/events/${id}/attendance/override`, data),
  exportAttendance: (id) => api.get(`/organizer/events/${id}/attendance/export`, { responseType: 'blob' }),
  submitResetRequest: (data) => api.post('/organizer/password-reset-request', data),
  getMyResetRequests: () => api.get('/organizer/password-reset-requests')
};

// ==================== ADMIN ====================
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getOrganizers: () => api.get('/admin/organizers'),
  createOrganizer: (data) => api.post('/admin/organizers', data),
  deleteOrganizer: (id) => api.delete(`/admin/organizers/${id}`),
  toggleOrganizer: (id) => api.patch(`/admin/organizers/${id}/toggle`),
  getPasswordResets: () => api.get('/admin/password-resets'),
  approvePasswordReset: (id, data) => api.patch(`/admin/password-resets/${id}/approve`, data),
  rejectPasswordReset: (id, data) => api.patch(`/admin/password-resets/${id}/reject`, data),
  getSecurityEvents: () => api.get('/admin/security/events'),
  getBlockedIPs: () => api.get('/admin/security/blocked'),
  blockIP: (data) => api.post('/admin/security/block', data),
  unblockIP: (ip) => api.delete(`/admin/security/block/${encodeURIComponent(ip)}`)
};

export default api;