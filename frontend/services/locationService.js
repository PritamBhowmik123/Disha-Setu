/**
 * services/locationService.js
 * Fetches distinct project locations from the backend.
 */
import { apiFetch } from './api';

export const fetchLocations = async () => {
    const data = await apiFetch('/locations');
    return data.locations || [];
};
