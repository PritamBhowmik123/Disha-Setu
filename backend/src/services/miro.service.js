/**
 * src/services/miro.service.js
 * Integration with Miro REST API v2 using native fetch (SDK-less)
 */
const { query } = require('../config/db');

class MiroService {
    constructor() {
        this.token = process.env.MIRO_API_KEY;
    }

    async _request(endpoint, options = {}) {
        if (!this.token) {
            this.token = process.env.MIRO_API_KEY;
        }
        if (!this.token) {
            throw new Error("MIRO_API_KEY is missing. Please add it to .env and restart.");
        }

        const url = `https://api.miro.com/v2/${endpoint.replace(/^\//, '')}`;
        const config = {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            console.error(`[MiroService] ${config.method || 'GET'} ${url} failed:`, data);
            throw new Error(data.message || `Miro API error: ${response.status}`);
        }

        return data;
    }

    /**
     * Creates a new Miro board for a specific floor analysis
     */
    async createBoard(floorName) {
        try {
            const data = await this._request('boards', {
                method: 'POST',
                body: {
                    name: `Blueprint: ${floorName}`,
                    description: 'AI Generated Floor Plan for DishaSetu',
                    policy: {
                        permissionsPolicy: {
                            collaborationToolsStartResponce: 'all_editors',
                            copyAndExport: 'anyone',
                            sharingPolicy: 'team_referral_allowed'
                        }
                    }
                }
            });
            return data.id;
        } catch (error) {
            console.error("[MiroService] Error creating board:", error.message);
            throw error;
        }
    }

    /**
     * Populates a Miro board with shapes (rooms) and connectors (links)
     */
    async populateBoard(boardId, graph) {
        try {
            const roomIdToMiroId = {};
            const step = 300;
            const cols = Math.ceil(Math.sqrt(graph.rooms.length));

            // 1. Create shapes for rooms
            for (let i = 0; i < graph.rooms.length; i++) {
                const room = graph.rooms[i];
                const shapeType = this._mapRoomToShape(room.type);
                
                const data = await this._request(`boards/${boardId}/shapes`, {
                    method: 'POST',
                    body: {
                        data: {
                            content: `${room.name}\n[${room.type || 'room'}]`,
                            shape: shapeType
                        },
                        position: {
                            x: (i % cols) * step,
                            y: Math.floor(i / cols) * step
                        },
                        geometry: {
                            width: 150,
                            height: 100
                        }
                    }
                });

                roomIdToMiroId[room.id] = data.id;
            }

            // 2. Create connectors for links
            for (const conn of graph.connections) {
                const startId = roomIdToMiroId[conn.source];
                const endId = roomIdToMiroId[conn.target];

                if (startId && endId) {
                    const connectorBody = {
                        startItem: { id: startId },
                        endItem: { id: endId }
                    };

                    if (conn.distance) {
                        connectorBody.captions = [{
                            content: `${conn.distance}m`
                        }];
                    }

                    console.log(`[MiroService] Connecting ${startId} to ${endId}`);
                    await this._request(`boards/${boardId}/connectors`, {
                        method: 'POST',
                        body: connectorBody
                    });
                }
            }

            return { boardUrl: `https://miro.com/app/board/${boardId}/` };
        } catch (error) {
            console.error("[MiroService] Error populating board:", error.message);
            throw error;
        }
    }

    /**
     * Parses Miro board items back into a graph structure
     */
    async getBoardGraph(boardId) {
        try {
            // Get shapes
            const shapesData = await this._request(`boards/${boardId}/items?type=shape&limit=50`);
            // Get connectors (Must use dedicated /connectors endpoint in V2)
            const connectorsData = await this._request(`boards/${boardId}/connectors?limit=50`);
            
            const rooms = [];
            const connections = [];

            // Process shapes as rooms
            for (const item of shapesData.data || []) {
                const content = item.data?.content || '';
                // Handle HTML content from Miro
                const cleanContent = content.replace(/<[^>]*>/g, '').trim(); 
                const match = cleanContent.match(/(.*)\[(.*)\]/s);
                
                const name = match ? match[1].trim() : cleanContent.trim();
                const type = match ? match[2].trim() : 'room';

                rooms.push({
                    id: item.id,
                    name: name || 'Unnamed',
                    type: type || 'room'
                });
            }

            // Process connectors as edges
            for (const item of connectorsData.data || []) {
                if (item.startItem?.id && item.endItem?.id) {
                    const caption = (item.captions?.[0]?.content || '').replace(/<[^>]*>/g, '').trim();
                    connections.push({
                        source: item.startItem.id,
                        target: item.endItem.id,
                        distance: parseInt(caption) || 5
                    });
                }
            }

            return { rooms, connections };
        } catch (error) {
            console.error("[MiroService] Error fetching board graph:", error.message);
            throw error;
        }
    }

    _mapRoomToShape(type) {
        const mapping = {
            'entrance': 'triangle',
            'restroom': 'octagon',
            'office': 'rectangle',
            'corridor': 'rectangle',
            'elevator': 'rectangle',
            'stairs': 'parallelogram'
        };
        return mapping[type?.toLowerCase()] || 'rectangle';
    }
}

module.exports = new MiroService();
