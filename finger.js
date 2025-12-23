const Zkteco = require("zkteco-js");

const DEVICE_IP = '192.168.18.198';
const DEVICE_PORT = 4370;

const manageZktecoDevice = async () => {
    const device = new Zkteco(DEVICE_IP, 4370, 5200, 5000);

    try {
        // Create socket connection to the device
        await device.createSocket();

        const buffer = Buffer.alloc(10);
        buffer.writeUInt8('49', 0); // uid (numeric)
        buffer.writeUInt8('48', 1); // uid (numeric)
        buffer.writeUInt8('48', 2); // uid (numeric)

        buffer.writeUInt8(2, 6);  // finger index (0-9)
        buffer.writeUInt8(0, 7);                 // privilege = 0 (normal user)
        buffer.writeUInt8(1, 8);                 // enabled = 1

        const res = await device.executeCmd('61',buffer)
        console.log(res)

        // Manually disconnect after using real-time logs
        await device.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
};

manageZktecoDevice();