/**
 * Test indoor navigation API endpoints
 */
require('dotenv').config();
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    resolve(data);
                }
            });
        }).on('error', reject);
    });
}

async function runTests() {
    console.log('🧪 Testing Indoor Navigation API\n');
    
    try {
        // Test 1: Get all buildings
        console.log('1. GET /api/buildings');
        const buildingsResponse = await makeRequest('/api/buildings');
        const buildings = buildingsResponse.buildings || buildingsResponse;
        console.log(`   ✓ Found ${buildings.length} building(s)`);
        if (buildings.length > 0) {
            console.log(`   Building: ${buildings[0].name}`);
            const buildingId = buildings[0].id;
            
            // Test 2: Get floors for building
            console.log('\n2. GET /api/buildings/' + buildingId + '/floors');
            const floorsResponse = await makeRequest(`/api/buildings/${buildingId}/floors`);
            const floors = floorsResponse.floors || floorsResponse;
            console.log(`   ✓ Found ${floors.length} floor(s)`);
            
            if (floors.length > 0) {
                const floorId = floors[0].id;
                
                // Test 3: Get rooms for floor
                console.log('\n3. GET /api/floors/' + floorId + '/rooms');
                const roomsResponse = await makeRequest(`/api/floors/${floorId}/rooms`);
                const rooms = roomsResponse.rooms || roomsResponse;
                console.log(`   ✓ Found ${rooms.length} room(s)`);
                if (rooms.length > 0) {
                    console.log(`   Sample room: ${rooms[0].name} (${rooms[0].type})`);
                }
                
                // Test 4: Search for radiology
                console.log('\n4. GET /api/navigation/search?q=radiology');
                const searchResponse = await makeRequest('/api/navigation/search?q=radiology');
                const searchResults = searchResponse.results || searchResponse;
                console.log(`   ✓ Found ${searchResults.length} result(s)`);
                if (searchResults.length > 0) {
                    console.log(`   ${searchResults[0].name} on Floor ${searchResults[0].floor_number}`);
                }
                
                // Test 5: Find a route
                if (rooms.length >= 2) {
                    const startRoom = rooms[0].id;
                    const endRoom = rooms[rooms.length - 1].id;
                    
                    console.log('\n5. GET /api/navigation/route?from=' + startRoom + '&to=' + endRoom);
                    const route = await makeRequest(`/api/navigation/route?from=${startRoom}&to=${endRoom}&accessible=false`);
                    
                    if (route.path && route.path.length > 0) {
                        console.log(`   ✓ Route found with ${route.path.length} steps`);
                        if (route.totalDistance) {
                            console.log(`   Total distance: ${route.totalDistance.toFixed(1)}m`);
                        }
                        if (route.directions && route.directions.length > 0) {
                            console.log(`   Steps:`);
                            route.directions.slice(0, 3).forEach((dir, i) => {
                                console.log(`      ${i + 1}. ${dir}`);
                            });
                            if (route.directions.length > 3) {
                                console.log(`      ... ${route.directions.length - 3} more steps`);
                            }
                        }
                    } else {
                        console.log(`   ⚠️  No route found`);
                    }
                }
                
                // Test 6: Accessible route
                if (rooms.length >= 2) {
                    const startRoom = rooms[0].id;
                    const endRoom = rooms[rooms.length - 1].id;
                    
                    console.log('\n6. GET /api/navigation/route?accessible=true');
                    const route = await makeRequest(`/api/navigation/route?from=${startRoom}&to=${endRoom}&accessible=true`);
                    
                    if (route.path && route.path.length > 0) {
                        console.log(`   ✓ Accessible route found with ${route.path.length} steps`);
                        if (route.totalDistance) {
                            console.log(`   Total distance: ${route.totalDistance.toFixed(1)}m`);
                        }
                    } else {
                        console.log(`   ⚠️  No accessible route found`);
                    }
                }
            }
        }
        
        console.log('\n✨ All tests completed!\n');
        
    } catch (err) {
        console.error('\n❌ Test failed:', err.message);
        process.exit(1);
    }
}

runTests();
