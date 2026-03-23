/**
 * services/projectService.js
 * Project API calls
 */
import { apiFetch } from './api';

export const fetchProjects = async ({ lat, lng, limit = 50 } = {}) => {
    let path = '/projects';
    const params = new URLSearchParams();
    if (lat != null) params.append('lat', lat);
    if (lng != null) params.append('lng', lng);
    if (limit) params.append('limit', limit);
    const qs = params.toString();
    if (qs) path += `?${qs}`;
    const data = await apiFetch(path);
    return data.projects || [];
};

export const fetchNearbyProjects = async ({ lat, lng, radius = 5000 }) => {
    const data = await apiFetch(`/projects/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    return data.projects || [];
};

export const fetchProjectById = async (id) => {
    const data = await apiFetch(`/projects/${id}`);
    return data.project;
};

export const fetchProjectUpdates = async (id) => {
    const data = await apiFetch(`/projects/${id}/updates`);
    return data.updates || [];
};

export const fetchProjectFeedback = async (id, page = 1, limit = 10) => {
    const data = await apiFetch(`/projects/${id}/feedback?page=${page}&limit=${limit}`);
    return data.feedback || [];
};

export const updateUserLocation = async (lat, lng) => {
    return apiFetch('/projects/location', {
        method: 'POST',
        body: JSON.stringify({ lat, lng }),
    });
};
