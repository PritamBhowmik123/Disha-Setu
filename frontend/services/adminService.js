/**
 * services/adminService.js
 * Admin API client
 */
import { apiFetch, apiUpload } from './api';

/**
 * Dashboard Stats
 */
export const getDashboardStats = async () => {
    return await apiFetch('/admin/dashboard/stats');
};

/**
 * Feedback Management
 */
export const getAllFeedback = async (params = {}) => {
    const { status, category, limit = 50, offset = 0 } = params;
    const queryParams = new URLSearchParams();
    
    if (status) queryParams.append('status', status);
    if (category) queryParams.append('category', category);
    queryParams.append('limit', limit);
    queryParams.append('offset', offset);
    
    return await apiFetch(`/admin/feedback?${queryParams.toString()}`);
};

export const updateFeedbackStatus = async (id, status) => {
    return await apiFetch(`/admin/feedback/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });
};

export const deleteFeedback = async (id) => {
    return await apiFetch(`/admin/feedback/${id}`, {
        method: 'DELETE'
    });
};

/**
 * Feedback Analytics
 */
export const getFeedbackAnalytics = async () => {
    return await apiFetch('/admin/analytics/feedback');
};

/**
 * Indoor Navigation Management
 */
export const getNavigationData = async (buildingId = null) => {
    const url = buildingId 
        ? `/admin/navigation/data?building_id=${buildingId}`
        : '/admin/navigation/data';
    return await apiFetch(url);
};

export const addRoom = async (roomData) => {
    return await apiFetch('/admin/navigation/rooms', {
        method: 'POST',
        body: JSON.stringify(roomData)
    });
};

export const updateRoom = async (id, roomData) => {
    return await apiFetch(`/admin/navigation/rooms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(roomData)
    });
};

export const deleteRoom = async (id) => {
    return await apiFetch(`/admin/navigation/rooms/${id}`, {
        method: 'DELETE'
    });
};

export const addConnection = async (connectionData) => {
    return await apiFetch('/admin/navigation/connections', {
        method: 'POST',
        body: JSON.stringify(connectionData)
    });
};

export const deleteConnection = async (id) => {
    return await apiFetch(`/admin/navigation/connections/${id}`, {
        method: 'DELETE'
    });
};

export const addBuilding = async (buildingData) => {
    return await apiFetch('/admin/navigation/buildings', {
        method: 'POST',
        body: JSON.stringify(buildingData)
    });
};

export const addFloor = async (floorData) => {
    return await apiFetch('/admin/navigation/floors', {
        method: 'POST',
        body: JSON.stringify(floorData)
    });
};

export const scanBlueprint = async (formData) => {
    return await apiUpload('/admin/navigation/scan-blueprint', formData);
};

/**
 * Admin Incident Management
 */
export const getAllIncidents = async (buildingId = null) => {
    const url = buildingId 
        ? `/navigation/incidents/all?building_id=${buildingId}`
        : '/navigation/incidents/all';
    return await apiFetch(url);
};

export const createIncident = async (incidentData) => {
    return await apiFetch('/navigation/incidents', {
        method: 'POST',
        body: JSON.stringify(incidentData)
    });
};

export const toggleIncident = async (id, isActive) => {
    return await apiFetch(`/navigation/incidents/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive })
    });
};

export const deleteIncident = async (id) => {
    return await apiFetch(`/navigation/incidents/${id}`, {
        method: 'DELETE'
    });
};

/**
 * User Management
 */
export const getAllUsers = async (params = {}) => {
    const { limit = 50, offset = 0 } = params;
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    queryParams.append('offset', offset);
    
    return await apiFetch(`/admin/users?${queryParams.toString()}`);
};

export const updateUserRole = async (userId, role) => {
    return await apiFetch(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
    });
};

