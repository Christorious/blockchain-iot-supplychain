const awsIot = require('aws-iot-device-sdk');
const { Web3 } = require('web3');

// ─── DEVICE CONFIGURATION ───────────────────────
const DEVICE_ID = 'supply-device-3';
const STAGE     = 'Warehouse-Intermediary';
const LOCATION  = 'Tema Port Warehouse';
const THRESHOLD = 38;
// ────────────────────────────────────────────────

const device = awsIot.device({
  keyPath:  'D:\\iot-sensor\\sc3\\e4fd5b4d02ff492c8906b406237e84f883d5f6f7049e537fd5de4e8f8ce4be15-private.pem.key',
  certPath: 'D:\\iot-sensor\\sc3\\e4fd5b4d02ff492c8906b406237e84f883d5f6f7049e537fd5de4e8f8ce4be15-certificate.pem.crt',
  caPath:   'D:\\iot-sensor\\sc3\\AmazonRootCA1.pem',
  clientId: DEVICE_ID,
  host:     'YOUR-IOT-ENDPOINT.iot.us-east-1.amazonaws.com'
});

const web3 = new Web3('http://127.0.0.1:7545');
const contractAddress = 'YOUR-NEW-CONTRACT-ADDRESS';
const abi = [
  {
    "inputs": [
      {"internalType": "string",  "name": "_stage",       "type": "string"},
      {"internalType": "string",  "name": "_location",    "type": "string"},
      {"internalType": "string",  "name": "_condition",   "type": "string"},
      {"internalType": "uint256", "name": "_temperature", "type": "uint256"}
    ],
    "name": "addEntry",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalEntries",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalAnomalies",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const contract = new web3.eth.Contract(abi, contractAddress);
let count = 0;

// Temperature simulation — spikes every 4th reading
function getTemperature() {
  if (count % 4 === 3) {
    // Deliberate spike above threshold
    return Math.floor(39 + Math.random() * 6); // 39–44°C
  }
  return Math.floor(28 + Math.random() * 8); // 28–35°C normal
}

async function publishAndRecord() {
  try {
    const temp = getTemperature();
    const isAnomaly = temp > THRESHOLD;
    const condition = isAnomaly ? 'WARNING-TempSpike' : 'Good';

    const payload = {
      deviceId:    DEVICE_ID,
      stage:       STAGE,
      location:    LOCATION,
      temperature: temp,
      condition:   condition,
      anomaly:     isAnomaly,
      timestamp:   new Date().toISOString()
    };

    // Publish to AWS IoT Core
    const topic = isAnomaly ? 'supplychain/anomaly' : 'supplychain/data';
    device.publish(topic, JSON.stringify(payload));

    if (isAnomaly) {
      console.log('\n🚨 ─────────────────────────────────────');
      console.log(`🚨 ANOMALY DETECTED — Reading #${count + 1}`);
      console.log(`🌡️  Temperature: ${temp}°C — ABOVE ${THRESHOLD}°C THRESHOLD`);
      console.log(`📍 Location: ${LOCATION}`);
      console.log(`📡 Published to topic: supplychain/anomaly`);
      console.log('🚨 ─────────────────────────────────────\n');
    } else {
      console.log(`📡 Reading #${count + 1} | Temp: ${temp}°C | Condition: ${condition}`);
    }

    // Write to blockchain
    const accounts = await web3.eth.getAccounts();
    await contract.methods.addEntry(
      STAGE,
      LOCATION,
      condition,
      temp
    ).send({ from: accounts[0], gas: 300000 });

    // Show anomaly count after each spike
    if (isAnomaly) {
      const totalAnomalies = await contract.methods.getTotalAnomalies().call();
      console.log(`🔴 Total anomalies recorded on blockchain: ${totalAnomalies}`);
    }

    count++;

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

device.on('connect', () => {
  console.log(`✅ ${DEVICE_ID} connected to AWS IoT Core!`);
  console.log(`📍 Stage: ${STAGE} | Location: ${LOCATION}`);
  console.log(`⚠️  Anomaly threshold: above ${THRESHOLD}°C`);
  console.log(`🌡️  Spike simulation: every 4th reading`);
  console.log('─────────────────────────────────────\n');

  setInterval(publishAndRecord, 10000);
});

device.on('error', (err) => {
  console.error('❌ Device error:', err.message);
});
