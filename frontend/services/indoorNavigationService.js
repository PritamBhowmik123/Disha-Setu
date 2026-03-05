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
