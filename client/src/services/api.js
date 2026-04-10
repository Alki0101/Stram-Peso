import axios from "axios";

const API_URL = "http://localhost:3000/api/v1";

const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  };
};

const getAuthFormHeader = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const authAPI = {
  register: (data) => axios.post(`${API_URL}/auth/register`, data),
  login: (data) => axios.post(`${API_URL}/auth/login`, data),
  registerEmployee: (data) => axios.post(`${API_URL}/auth/register/employee`, data),
  generateInvite: () => axios.post(`${API_URL}/auth/invite`, {}, getAuthHeader()),
  getProfile: () => axios.get(`${API_URL}/auth/profile`, getAuthHeader()),
  updateProfile: (data) => axios.put(`${API_URL}/auth/profile`, data, getAuthFormHeader()),
  deleteAccount: () => axios.delete(`${API_URL}/auth/profile`, getAuthHeader()),
  registerEmployer: (data) => axios.post(`${API_URL}/auth/register/employer`, data),
};

export const jobAPI = {
  createJob: (data) => axios.post(`${API_URL}/jobs`, data, getAuthHeader()),
  getJobs: () => axios.get(`${API_URL}/jobs`, getAuthHeader()),
  getJobById: (id) => axios.get(`${API_URL}/jobs/${id}`, getAuthHeader()),
  updateJob: (id, data) => axios.put(`${API_URL}/jobs/${id}`, data, getAuthHeader()),
  deleteJob: (id) => axios.delete(`${API_URL}/jobs/${id}`, getAuthHeader()),
  applyToJob: (id, data) => axios.post(`${API_URL}/jobs/${id}/apply`, data, getAuthFormHeader()),
  getEmployerJobs: () => axios.get(`${API_URL}/jobs/mine`, getAuthHeader()),
  getApplicationsForJob: (id) => axios.get(`${API_URL}/jobs/${id}/applications`, getAuthHeader()),
  getMyApplications: () => axios.get(`${API_URL}/jobs/applications/me`, getAuthHeader()),
  updateApplication: (id, data) => axios.put(`${API_URL}/jobs/applications/${id}`, data, getAuthFormHeader()),
  deleteApplication: (id) => axios.delete(`${API_URL}/jobs/applications/${id}`, getAuthHeader()),
};

export const adminAPI = {
  getUsers: (params = {}) => axios.get(`${API_URL}/admin/users`, { ...getAuthHeader(), params }),
  getAnalytics: () => axios.get(`${API_URL}/admin/analytics`, getAuthHeader()),
  updateUserRole: (id, role) => axios.put(`${API_URL}/admin/users/${id}/role`, { role }, getAuthHeader()),
  deactivateUser: (id) => axios.put(`${API_URL}/admin/users/${id}/deactivate`, {}, getAuthHeader()),
  reactivateUser: (id) => axios.put(`${API_URL}/admin/users/${id}/reactivate`, {}, getAuthHeader()),
  updateEmployerVerification: (id, verificationStatus) =>
    axios.put(`${API_URL}/admin/users/${id}/verification`, { verificationStatus }, getAuthHeader()),
  deleteUser: (id) => axios.delete(`${API_URL}/admin/users/${id}`, getAuthHeader()),
  generateInvite: () => axios.post(`${API_URL}/auth/invite`, {}, getAuthHeader()),
};

export const messageAPI = {
  searchUsers: (query) => axios.get(`${API_URL}/messages/users/search`, { ...getAuthHeader(), params: { query } }),
  createConversation: (data) => axios.post(`${API_URL}/messages/conversations`, data, getAuthHeader()),
  getConversations: () => axios.get(`${API_URL}/messages/conversations`, getAuthHeader()),
  getMessages: (conversationId) => axios.get(`${API_URL}/messages/conversations/${conversationId}/messages`, getAuthHeader()),
  sendMessage: (conversationId, data) => axios.post(`${API_URL}/messages/conversations/${conversationId}/messages`, data, getAuthHeader()),
  deleteConversation: (conversationId) => axios.delete(`${API_URL}/messages/conversations/${conversationId}`, getAuthHeader()),
  getUnreadCount: () => axios.get(`${API_URL}/messages/unread-count`, getAuthHeader()),
};

export const employerAPI = {
  getStats: () => axios.get(`${API_URL}/employer/stats`, getAuthHeader()),
  getProfileStats: () => axios.get(`${API_URL}/employer/profile-stats`, getAuthHeader()),
  getJobs: () => axios.get(`${API_URL}/employer/jobs`, getAuthHeader()),
  createJob: (data) => axios.post(`${API_URL}/employer/jobs`, data, getAuthHeader()),
  updateJob: (id, data) => axios.put(`${API_URL}/employer/jobs/${id}`, data, getAuthHeader()),
  closeJob: (id) => axios.delete(`${API_URL}/employer/jobs/${id}`, getAuthHeader()),
  getApplicantsForJob: (jobId) => axios.get(`${API_URL}/employer/jobs/${jobId}/applicants`, getAuthHeader()),
  updateApplicationStatus: (applicationId, data) => axios.put(`${API_URL}/employer/applications/${applicationId}/status`, data, getAuthHeader()),
};

export const usersAPI = {
  completeOnboarding: (data) => axios.put(`${API_URL}/users/onboarding`, data, getAuthHeader()),
};

