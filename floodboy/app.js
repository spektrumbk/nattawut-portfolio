// ===== CONFIGURATION =====
const RPC_URL = 'https://rpc-l1.jibchain.net';
const CONTRACT_ADDRESS = '0xCd3Ec17ddFDa24f8F97131fa0FDf20e7cbd1A8Bb';
const SENSOR_ADDRESS = '0xB0E58B011924E049CE4B4D62298EDF43DFF0BDD'; // Target sensor (Universal Signer/Owner)

const ABI = [
    {
        "name": "getLatestRecord",
        "inputs": [{ "name": "sensor", "type": "address" }],
        "outputs": [
            { "name": "timestamp", "type": "uint256" },
            { "name": "values", "type": "int256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// ===== STATE =====
let provider;
let contract;

// ===== INITIALIZATION =====
async function init() {
    console.log("Initializing FloodBoy Blockchain Reader...");

    try {
        provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

        updateStatus("Online", "online");

        // Start polling
        fetchData();
        setInterval(fetchData, 10000); // Update every 10 seconds

    } catch (error) {
        console.error("Initialization Failed:", error);
        updateStatus("Connection Error", "error");
    }
}

// ===== DATA FETCHING =====
async function fetchData() {
    try {
        console.log("Fetching latest record from JIBCHAIN...");

        // In the real contract, sometimes we pass the store address or the signer address
        // Based on research, the store contract at 0xCd3Ec... holds records for its associated sensors.
        // We'll try querying with the sensor address found in research.
        const record = await contract.getLatestRecord(SENSOR_ADDRESS);

        const timestamp = record.timestamp.toNumber();
        const values = record.values; // int256[]

        // Values mapping (from research):
        // [0] d_radar_water_depth (scaled by 10,000)
        // [4] d_battery_voltage (scaled by 100)

        const rawDepth = values[0].toNumber();
        const rawBattery = values[4].toNumber();

        const depth = rawDepth / 10000;
        const battery = rawBattery / 100;

        updateUI(depth, battery, timestamp);

    } catch (error) {
        console.error("Fetch Data Failed:", error);
        // If specific sensor address fails, we might just be seeing a "missing record"
        // for that address on this specific contract.
    }
}

// ===== UI UPDATES =====
function updateUI(depth, battery, timestamp) {
    const depthEl = document.getElementById('depth-value');
    const batteryEl = document.getElementById('battery-value');
    const timeEl = document.getElementById('last-update');
    const trendEl = document.getElementById('depth-trend');
    const batteryStatusEl = document.getElementById('battery-status');

    // Update values with animation would be cool, but simple text update for now
    depthEl.innerText = depth.toFixed(3);
    batteryEl.innerText = battery.toFixed(1);

    // Update time
    const date = new Date(timestamp);
    timeEl.innerText = date.toLocaleTimeString();

    // Trend Logic (Simple)
    if (depth > 1.0) {
        trendEl.innerText = "⚠️ High Water Level";
        trendEl.style.color = "#f87171";
    } else {
        trendEl.innerText = "✓ Normal Level";
        trendEl.style.color = "#3fb950";
    }

    // Battery Logic
    if (battery > 12.0) {
        batteryStatusEl.innerText = "Healthy";
        batteryStatusEl.style.color = "#3fb950";
    } else {
        batteryStatusEl.innerText = "Low Voltage";
        batteryStatusEl.style.color = "#fbbf24";
    }
}

function updateStatus(text, type) {
    const statusEl = document.getElementById('network-status');
    const dot = statusEl.querySelector('.dot');
    const statusText = statusEl.querySelector('.text');

    statusText.innerText = text;
    dot.className = 'dot ' + type;
}

// Start
document.addEventListener('DOMContentLoaded', init);
