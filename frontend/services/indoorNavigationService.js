/**
 * services/indoorNavigationService.js
 * Indoor navigation API calls
 */
import { apiFetch } from './api';

export const fetchBuildings = async () => {
    const data = await apiFetch('/buildings');
    return data.buildings || [];
};

export const fetchBuildingById = async (id) => {
    const data = await apiFetch(`/buildings/${id}`);
    return data.building;
};

export const fetchBuildingFloors = async (buildingId) => {
    const data = await apiFetch(`/buildings/${buildingId}/floors`);
    return data.floors || [];
};

export const fetchFloorById = async (floorId) => {
    const data = await apiFetch(`/floors/${floorId}`);
    return data.floor;
};

export const fetchFloorRooms = async (floorId) => {
    const data = await apiFetch(`/floors/${floorId}/rooms`);
    return data.rooms || [];
};

export const fetchRoomById = async (roomId) => {
    const data = await apiFetch(`/rooms/${roomId}`);
    return data.room;
};

export const searchRooms = async (query, buildingId = null) => {
    let url = `/navigation/search?q=${encodeURIComponent(query)}`;
    if (buildingId) {
        url += `&building_id=${buildingId}`;
    }
    const data = await apiFetch(url);
    return data.results || [];
};

export const getRoute = async (fromRoomId, toRoomId, accessibleOnly = false) => {
    const url = `/navigation/route?from=${fromRoomId}&to=${toRoomId}&accessible=${accessibleOnly}`;
    const data = await apiFetch(url);
    return data;
};

export const getRoomInsights = async (roomId = null, buildingId = null) => {
    let url = '/navigation/room-insights';
    if (roomId) url += `?room_id=${roomId}`;
    else if (buildingId) url += `?building_id=${buildingId}`;
    const data = await apiFetch(url);
    return data;
};

export const getIncidentRoute = async (fromRoomId, toRoomId, options = {}) => {
    const { accessible = false, buildingId = null } = options;
    let url = `/navigation/incident-route?start_room_id=${fromRoomId}&end_room_id=${toRoomId}&accessible=${accessible}`;
    if (buildingId) url += `&building_id=${buildingId}`;
    const data = await apiFetch(url);
    return data;
};

export const getActiveIncidents = async (buildingId = null) => {
    let url = '/navigation/incidents';
    if (buildingId) url += `?building_id=${buildingId}`;
    const data = await apiFetch(url);
    return data;
};

export const fetchFloorConnections = async (floorId) => {
    const data = await apiFetch(`/floors/${floorId}/connections`);
    return data.connections || [];
};

// Alias for compatibility
export const getBuildings = fetchBuildings;

