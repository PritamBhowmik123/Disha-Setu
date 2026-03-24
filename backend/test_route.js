require('dotenv').config();
const { findRoute } = require('./src/services/indoor-navigation.service');

async function testVipRoute() {
    try {
        const fromId = '2dd2439e-31ca-446e-9fff-fb85dc28cf58';
        const toId = '92ab785f-55ec-4fde-a0ea-4f584219cb12'; // VIP Lounge
        const route = await findRoute(fromId, toId, { accessibleOnly: false });
        console.log("Route Result:", JSON.stringify(route, null, 2));
    } catch (e) {
        console.error("Routing Error:", e.message);
    } finally {
        process.exit();
    }
}
testVipRoute();
