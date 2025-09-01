const ZKLib = require('./node-zklib/zklib.js')
const DEVICE_IP = '192.168.1.198'
const test = async () => {

   try {
       let zkInstance = new ZKLib(DEVICE_IP, 4370, 10000, 4000);
       await zkInstance.createSocket()
       const logs = await zkInstance.getAttendances()
       console.log(logs)
       await zkInstance.disconnect()
   }catch (e) {
       console.log(e)

   }


}

test()

 