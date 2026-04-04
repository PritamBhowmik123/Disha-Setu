/**
 * /tmp/check_models.js
 * Test script to list available models for the GEMINI_API_KEY
 */
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function check() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No GEMINI_API_KEY found in .env");
        process.exit(1);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // The SDK doesn't have a direct 'listModels' in the top-level genAI object usually, 
        // but we can try to fetch them or just try a dummy request.
        
        console.log("Attempting to list models via fetch (native REST API)...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.error("API Error:", data.error);
        } else {
            console.log("Available Models:");
            data.models.forEach(m => console.log(` - ${m.name}`));
        }
    } catch (err) {
        console.error("Request failed:", err);
    }
}

check();
