const ZKLib = require('./node-zklib/zklib.js')
//const DEVICE_IP = '192.168.18.198'
const DEVICE_IP = '192.168.100.201'
const test = async () => {

   try {
       let zkInstance = new ZKLib(DEVICE_IP, 4370, 15000, 4000);
       await zkInstance.createSocket()
       //const logs = await zkInstance.getAttendances()
        const logs = await zkInstance.getInfo()
    //    const logs = await zkInstance.freeData()
       console.log(logs)
       await zkInstance.disconnect()
   }catch (e) {
       console.log(e)

   }


}

test()
 
