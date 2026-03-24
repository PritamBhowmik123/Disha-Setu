require('dotenv').config();
const { findRoute } = require('./src/services/indoor-navigation.service');

async function testHallRoute() {
    try {
        const fromId = 'aad658d2-d084-4494-8e3c-d6603050c92d'; // Main Entrance
        const toId = '2dd2439e-31ca-446e-9fff-fb85dc28cf58'; // Conference Hall 1
        const route = await findRoute(fromId, toId, { accessibleOnly: false });
        console.log("Route Result:", JSON.stringify(route, null, 2));
    } catch (e) {
        console.error("Routing Error:", e);
    } finally {
        process.exit();
    }
}
testHallRoute();
