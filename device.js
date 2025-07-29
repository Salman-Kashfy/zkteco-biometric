const ZKLib = require("zkteco-js");
const DEVICE_IP = '192.168.1.199'
zk = new ZKLib(DEVICE_IP, 4370, 10000);

const connection = async () => {
    try {
        await zk.createSocket();
        attendance = await zk.getAttendances()
        console.log(attendance)
    } catch (err) {
        connected = false;
        console.log("Failed to connect to ZKTeco device: "+err.message);
    }
}
connection()