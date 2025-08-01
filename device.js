const ZKLib = require("zkteco");
const DEVICE_IP = '192.168.18.2'
zk = new ZKLib([{ deviceIp: DEVICE_IP, devicePort: "4370" }]);

const connection = async () => {
    const CMD = {
        CMD_STARTENROLL: '003d'
    }
    try {
        await zk.connectAll();
        attendance = await zk.getAttendances(DEVICE_IP)
        console.log(attendance)
    } catch (err) {
        connected = false;
        console.log("Failed to connect to ZKTeco device: "+err.message);
    }
}
connection()