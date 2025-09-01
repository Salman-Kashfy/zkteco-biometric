const ZKLib = require("zkteco");
const DEVICE_IP = '192.168.18.198'
zk = new ZKLib([{ deviceIp: DEVICE_IP, devicePort: 4370 }]);

const connection = async () => {
    try {
        await zk.connectAll();

        const users = await zk.zklibTcp.getInfo(DEVICE_IP);
        const attendanceSize = await zk.zklibTcp.getAttendanceSize(DEVICE_IP);

        const devices = await zk.zklibTcp.getAllDevicces()
        const device = devices[0]
        // console.log({device})
        // const res = await zk.zklibTcp.executeCmd(device,13,'');
        const res = await zk.getUsers(DEVICE_IP);
        console.log({users,attendanceSize,res})

        let attendance = await zk.getAttendances(DEVICE_IP)
        console.log({attendance})
    } catch (err) {
        connected = false;
        console.log("Failed to connect to ZKTeco device: ",err.message);
    }
}
connection()