/**
 * LayerCD_Synthesis_Minimal.js
 * Testing if ONLY fetch fails or if it's the combination.
 */

const API_KEY = process.env.GEMINI_API_KEY;

async function runTest() {
    console.log('[Test] Running minimal synthesis fetch...');
    
    const systemPrompt = "Synthesize news.";
    const userPrompt = "Summarize: Conflict in Middle East escalating.";

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: userPrompt }] }],
                generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
            })
        });

        console.log("Status:", response.status);
        const data = await response.json();
        console.log("Success:", !!data.candidates);
    } catch (e) {
        console.error("Fail:", e.message);
    }
}

runTest();
