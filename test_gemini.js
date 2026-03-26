const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const crypto = require('crypto');

async function run() {
    console.log("TEST SCRIPT STARTING");
    const key = process.env.GEMINI_API_KEY;
    if (!key) { console.error("MISSING KEY"); return; }

    const genAI = new GoogleGenAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "List 3 news topics about the Middle East. Return JSON array of strings.";
    try {
        const result = await model.generateContent(prompt);
        console.log("RESPONSE:", result.response.text());
        fs.writeFileSync('test_output.json', JSON.stringify({ success: true, text: result.response.text() }));
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}

run();
