const ZKLib = require('./node-zklib/zklib.js')

const DEVICE_IP = '192.168.18.198';
const DEVICE_PORT = 4370;

async function enrollFingerprint(userId = 1, fingerId = 1) {
    const zk = new ZKLib(DEVICE_IP, 4370, 10000, 4000);
    await zk.createSocket();
    try {
        // 1. Connect to device
        console.log('Connected successfully');

        const buffer = Buffer.alloc(4);       // Allocate 4 bytes
        buffer.writeUInt32LE(userId, 0);      // Write user ID as little-endian

        const res = await zk.zklibTcp.executeCmd('18',buffer);
        console.log({res});
    } catch (err) {
        console.error('Error during enrollment:', err);
    } finally {}
}

enrollFingerprint(910, 1);