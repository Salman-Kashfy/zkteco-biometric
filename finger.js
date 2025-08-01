const ZKTeco = require("zkteco");

const DEVICE_IP = '192.168.18.2';
const DEVICE_PORT = 4370;

async function enrollFingerprint(userId = 1, fingerId = 1) {
    const devices = [{ deviceIp: DEVICE_IP, devicePort: DEVICE_PORT }];
    const zk = new ZKTeco(devices);
    try {
        // 1. Connect to device
        await zk.connectAll();
        console.log('Connected successfully');

        const devices = await zk.zklibTcp.getAllDevicces()
        const device = devices[0]

        const buffer = Buffer.alloc(4);       // Allocate 4 bytes
        buffer.writeUInt32LE(userId, 0);      // Write user ID as little-endian

        const res = await zk.zklibTcp.executeCmd(device,61,buffer);
        console.log({res});
    } catch (err) {
        console.error('Error during enrollment:', err);
    } finally {}
}

enrollFingerprint(1, 1);