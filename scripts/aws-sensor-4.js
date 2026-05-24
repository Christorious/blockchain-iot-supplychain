const awsIot = require("aws-iot-device-sdk");
const { Web3 } = require("web3");

// ─── DEVICE CONFIGURATION ───────────────────────
const DEVICE_ID = "supply-device-4";
const STAGE = "Buyer";
const LOCATION = "Accra Market";
const CERT_PATH = "D:\iot-sensor\sc4";
// ────────────────────────────────────────────────

// Connect to AWS IoT Core
const device = awsIot.device({
  keyPath:
    "D:\\iot-sensor\\sc4\\dfa7fa5520a5827de1fb5c6d3de5f527162b8886b2a188bfdcf364a483a26b01-private.pem.key",
  certPath:
    "D:\\iot-sensor\\sc4\\dfa7fa5520a5827de1fb5c6d3de5f527162b8886b2a188bfdcf364a483a26b01-certificate.pem.crt",
  caPath: "D:\\iot-sensor\\sc4\\AmazonRootCA1 (1).pem",
  clientId: DEVICE_ID,
  host: "a3exhiznajwxo2-ats.iot.eu-north-1.amazonaws.com",
});

// Connect to local Ganache blockchain
const web3 = new Web3("http://127.0.0.1:7545");
const contractAddress = "0xE00B38505170020B8406662488b6Ce3c489FCA10";
const abi = [
  {
    inputs: [
      { internalType: "string", name: "_stage", type: "string" },
      { internalType: "string", name: "_location", type: "string" },
      { internalType: "string", name: "_condition", type: "string" },
      { internalType: "string", name: "_temperature", type: "string" },
    ],
    name: "addEntry",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalEntries",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

const contract = new web3.eth.Contract(abi, contractAddress);
let count = 0;

async function publishAndRecord(payload) {
  try {
    // Step 1 — Publish to AWS IoT Core
    device.publish("supplychain/data", JSON.stringify(payload));
    console.log(`📡 Published to AWS IoT Core:`, payload);

    // Step 2 — Write to blockchain
    const accounts = await web3.eth.getAccounts();
    await contract.methods
      .addEntry(
        payload.stage,
        payload.location,
        payload.condition,
        payload.temperature,
      )
      .send({ from: accounts[0], gas: 300000 });

    console.log(`✅ Recorded on blockchain! Total entries recorded.`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

device.on("connect", () => {
  console.log(`✅ ${DEVICE_ID} connected to AWS IoT Core!`);
  console.log(`📍 Stage: ${STAGE} | Location: ${LOCATION}`);
  console.log("─────────────────────────────────────");

  setInterval(() => {
    const temp = (28 + Math.random() * 8).toFixed(1) + "C";
    const condition = Math.random() > 0.1 ? "Good" : "WARNING-TempSpike";

    const payload = {
      deviceId: DEVICE_ID,
      stage: STAGE,
      location: LOCATION,
      temperature: temp,
      condition: condition,
      timestamp: new Date().toISOString(),
    };

    count++;
    console.log(`\n📡 Reading #${count}`);
    publishAndRecord(payload);
  }, 10000);
});

device.on("error", (err) => {
  console.error("❌ Device error:", err.message);
});
