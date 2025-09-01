const ZKLib = require("node-zklib");
const DEVICE_IP = '192.168.1.199'
zk = new ZKLib(DEVICE_IP,4370, 20000, 4000);

const connection = async () => {
    try {
        await zk.createSocket();

        // const attendance = await zk.getAttendances();
        // console.log({attendance})

        const attendance = await zk.getAttendances();
        console.log({attendance,size: attendance.length})

        // await zk.zklibTcp.executeCmd(31, '');
        // const res = await zk.zklibTcp.executeCmd(13, Buffer.alloc(0));
        // console.log(parseAttendanceBuffer(res))

        // const devices = await zk.zklibTcp.getAllDevicces()
        // const device = devices[0]
        // console.log({device})
        // const res = await zk.zklibTcp.executeCmd(device,13,'');
    } catch (err) {
        connected = false;
        console.log("Failed to connect to ZKTeco device: ",err.message);
    }
}

const parseAttendanceBuffer = (buffer) => {
    const records = [];
    const recordLength = 16;

    for (let offset = 0; offset + recordLength <= buffer.length; offset += recordLength) {
        const slice = buffer.slice(offset, offset + recordLength);

        const userId = slice.readUInt16LE(0); // 2 bytes
        const year = slice.readUInt16LE(2);
        const month = slice[4];
        const day = slice[5];
        const hour = slice[6];
        const minute = slice[7];
        const second = slice[8];
        const verifyType = slice[9];
        const inOutMode = slice[10]; // 👈 this is the state (check-in/check-out)

        const timestamp = new Date(year, month - 1, day, hour, minute, second);

        records.push({
            userId,
            timestamp,
            verifyType,
            state: inOutMode
        });
    }

    return records;
};

// Poll every 10 seconds
async function scheduleRun() {
    try {
        await connection();
    } catch (e) {
        console.log("Run failed: " + e.message);
    } finally {
        setTimeout(scheduleRun, 10000);  // Always schedule the next run
    }
}

scheduleRun();