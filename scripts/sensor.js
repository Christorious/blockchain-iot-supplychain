const { Web3 } = require('web3');

// Connect to Ganache
const web3 = new Web3('http://127.0.0.1:7545');

// YOUR contract address from Remix
const contractAddress = 'PASTE_YOUR_CONTRACT_ADDRESS_HERE';

// YOUR ABI from Remix
const abi = PASTE_YOUR_ABI_HERE;

// Create contract instance
const contract = new web3.eth.Contract(abi, contractAddress);

// Simulate IoT sensor readings
const stages = ['IoT-Sensor-Kumasi', 'IoT-Sensor-Highway', 'IoT-Sensor-Accra'];
const locations = ['Kumasi Warehouse', 'Accra Highway Checkpoint', 'Accra Market'];
let readingCount = 0;

async function sendSensorReading() {
    try {
        // Get accounts from Ganache
        const accounts = await web3.eth.getAccounts();
        
        // Simulate rotating through the 3 supply chain stages
        const stageIndex = readingCount % 3;
        
        // Generate realistic sensor data
        const temp = (28 + Math.random() * 8).toFixed(1) + 'C';
        const condition = Math.random() > 0.1 ? 'Good' : 'WARNING-TempSpike';
        
        console.log('─────────────────────────────────────');
        console.log(`📡 Reading #${readingCount + 1}`);
        console.log(`📍 Stage:       ${stages[stageIndex]}`);
        console.log(`🌍 Location:    ${locations[stageIndex]}`);
        console.log(`🌡️  Temperature: ${temp}`);
        console.log(`📦 Condition:   ${condition}`);
        console.log('⏳ Sending to blockchain...');

        // Send to blockchain
        await contract.methods.addEntry(
            stages[stageIndex],
            locations[stageIndex],
            condition,
            temp
        ).send({ 
            from: accounts[0], 
            gas: 300000 
        });

        readingCount++;
        console.log(`✅ Recorded! Total entries: ${readingCount + 3}`);
        console.log(`🔗 Check Ganache Transactions tab to verify`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

// Send a reading every 8 seconds
console.log('🚀 IoT Sensor Started!');
console.log('📡 Sending readings every 8 seconds...');
console.log('⛔ Press Ctrl+C to stop\n');

setInterval(sendSensorReading, 8000);

// Send first reading immediately
sendSensorReading();
