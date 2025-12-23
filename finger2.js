const Zkteco = require("zkteco-js");

const DEVICE_IP = '192.168.18.198';
const DEVICE_PORT = 4370;

const manageZktecoDevice = async () => {
    const device = new Zkteco(DEVICE_IP, 4370, 5200, 5000);

    try {
        // Create socket connection to the device
        await device.createSocket();
        const {data:user} = await device.getUsers()
        console.log(user.find((e) => Number(e.userId) === 910))
        //console.log(user)

        // Manually disconnect after using real-time logs
        await device.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
};

manageZktecoDevice();