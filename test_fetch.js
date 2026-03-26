async function test() {
    console.log("Testing fetch...");
    try {
        const response = await fetch("https://www.google.com");
        console.log("Status:", response.status);
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}
test();
