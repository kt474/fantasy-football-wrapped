const baseUrl = (process.env.VITE_AWARDS_API_URL || "http://localhost:3000").replace(/\/$/, "");
const endpoint = `${baseUrl}/api/awards`;

async function main() {
  console.log(`Checking awards API at: ${endpoint}`);
  try {
    const res = await fetch(endpoint, { method: "GET" });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log("Response JSON:", JSON.stringify(json, null, 2));
    } catch {
      console.log("Non-JSON response body:\n", text.slice(0, 500));
    }
  } catch (error) {
    console.error("Request failed:", error?.message || error);
    console.error("Hint: ensure `vercel dev` is running on port 3000 or set VITE_AWARDS_API_URL to a reachable deployment.");
    process.exit(1);
  }
}

main();
