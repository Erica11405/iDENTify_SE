/**
 * iDENTify Frontend-to-Backend Connection Test
 *
 * This script verifies if the frontend environment can reach the backend API.
 * Run this from the project root using Node.js.
 *
 * Usage: node iDENTify-Web/frontend/test/testConnection.js
 */

require("dotenv").config({ path: process.cwd() + "/.env" });

const BACKEND_URL = process.env.VITE_API_BASE || "";
const API_BASE = `${BACKEND_URL}/api`;

async function testConnection() {
  console.log("--- iDENTify Connection Test ---");
  console.log(`Target Backend: ${BACKEND_URL}`);
  console.log(`Target API Base: ${API_BASE}`);
  console.log("--------------------------------");

  try {
    // 1. Test Root/Health endpoint
    console.log("[1/2] Testing Backend Health...");
    const healthRes = await fetch(`${BACKEND_URL}/health`);
    if (healthRes.ok) {
      const status = await healthRes.text();
      console.log(`✅ Success: Backend is ${status}`);
    } else {
      console.log(
        `❌ Failed: Backend returned ${healthRes.status} ${healthRes.statusText}`,
      );
    }

    // 2. Test a specific API endpoint (Clinics Discovery is usually public)
    console.log("\n[2/2] Testing API Discovery Endpoint...");
    const apiRes = await fetch(`${API_BASE}/clinics/discover`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      console.log("✅ Success: API is reachable and returning data");
      console.log(`Found ${data.length} clinics in discovery.`);
    } else {
      console.log(
        `❌ Failed: API returned ${apiRes.status} ${apiRes.statusText}`,
      );
      const errorText = await apiRes.text();
      console.log(`Response: ${errorText.substring(0, 100)}...`);
    }

    console.log("\n--------------------------------");
    console.log("Conclusion: Connection test completed.");
  } catch (error) {
    console.error("\n❌ CRITICAL ERROR: Could not reach backend.");
    console.error(`Error details: ${error.message}`);
    console.log("\nPossible causes:");
    console.log(
      "1. Backend server is not running (npm run dev in backend folder)",
    );
    console.log(
      "2. Backend is running on a different port (check server.js or .env)",
    );
    console.log("3. Firewall or Network issue");
  }
}

testConnection();
