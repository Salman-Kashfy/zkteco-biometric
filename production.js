require('./pkg-sqlite3-bootstrap');
const axios = require('axios');
const ZKLib = require('./node-zklib/zklib.js')
const moment = require("moment");
const SERVER_URL = 'https://localhost:5000/api/biometric-attendance'
//const SERVER_URL = 'https://api.cloudfitnest.com/api/biometric-attendance'
const https = require('https');
const { EventLogger } = require('node-windows');
const log = new EventLogger('zk-agent');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const sqlite3 = require('sqlite3').verbose()
const { open } = require('sqlite')

/**
 * Changes based on gym
 * */
const DEVICE_IP = '192.168.18.198'
const GYM_ID = '11ab66c5-ffe1-4825-822b-16c4147b5172'
const DEVICE_BRAND = 'zkteco'
const INSTALLATION_DATE = '2025-11-04'

let zk, attendance = [], chunkSize = 15, connected = false, tableCreated = false, db = null

async function dbConn() {
    if (db) return db;
    db = await open({
        filename: './database.sqlite',
        driver: sqlite3.cached.Database
    });
    return db;
}

async function deviceConn() {
    if (zk) {
        try {
            zk.socket?.removeAllListeners(); // <-- cleanup old listeners
            await zk.disconnect();
        } catch (e) {}
        zk = null;
    }

    connected = false;
    zk = new ZKLib(DEVICE_IP, 4370, 10000, 4000);

    try {
        await zk.createSocket();
        connected = true;
        //_log("TCP connection successful");
    } catch (err) {
        _log("Failed to connect to ZKTeco device: ", err.code);
        return;
    }
}

function _log(message, err){
    log.info(message, err || '');
    console.log(message, err || '');
}

async function createTable(db) {
    await db.run(`
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sn INT UNIQUE,
            state INT,
            user_id INT,
            bio_date DATE
        )
    `)
}

async function getRow(sn) {
    return db.get(`SELECT * FROM attendance WHERE sn = ?`, [sn]);
}

async function insertRow({sn,state,userId,bioDate}) {
    return db.run(
        `INSERT INTO attendance (sn, state, user_id, bio_date) VALUES (?, ?, ?, ?)`,
        [sn, state, userId, bioDate]
    );
}

async function updateRow({sn,state,userId,bioDate}) {
    return db.run(
        `UPDATE attendance SET state = ?, user_id = ?, bio_date = ? WHERE sn = ?`,
        [state, userId, bioDate, sn]
    );
}

function withTimeout(promise, ms, errorMessage = 'Timeout') {
    const timeout = new Promise((_, reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error(errorMessage));
        }, ms);
    });

    return Promise.race([promise, timeout]);
}

async function run() {
    await Promise.all([dbConn(), deviceConn()])
    if(!connected || !db) {
        return
    }

    try {
        const time = await withTimeout(zk.getInfo(DEVICE_IP), 3000, 'Device not responding');
        if(!time) throw Error('Ping failed or timed out')
    } catch (err) {
        _log('Ping failed or timed out:', err.message);
        zk = null;
        connected = false;
        return;
    }

    if(!tableCreated){
        await createTable(db)
        tableCreated = true
    }
    const UPDATE = {}

    try {
        attendance = await zk.getAttendances()
        attendance = attendance?.data
    } catch (e) {
        zk = null;
        connected = false;
        return;
    }

    const fAttendance = []
    for (const att of attendance) {
        const { userSn,verifyType,verify_state,deviceUserId,recordTime } = att
        const sn = userSn
        const type = verifyType
        const state = verify_state
        const user_id = deviceUserId
        const record_time = recordTime

        const [bioDate, bioTime] = moment(new Date(record_time)).format('YYYY-MM-DD HH:mm:ss').split(' ')
        if (bioDate < INSTALLATION_DATE) {
            continue;
        }
        const dbRow = await getRow(Number(sn))
        if(dbRow?.user_id === Number(user_id) && dbRow.state === Number(state) && dbRow.bio_date === bioDate){
            continue
        }else if(dbRow) {
            UPDATE[sn] = 1
        }
        fAttendance.push({ sn, type, state, userId:user_id, bioDate, bioTime, record_time })
    }
    fAttendance.sort((a, b) => new Date(b.record_time) - new Date(a.record_time));

    if(fAttendance.length){
        const _attendance = fAttendance.slice(0,chunkSize)
        const params = {gymId: GYM_ID, deviceBrand: DEVICE_BRAND, attendance:_attendance}
        axios.post(SERVER_URL,params,{httpsAgent}).then(async (e) => {
            if(e.data.status){
                const promises = []
                for (const att of _attendance) {
                    if(UPDATE[att.sn]){
                        promises.push(updateRow(att))
                    } else {
                        promises.push(insertRow(att))
                    }
                }
                await Promise.all(promises)
            }
        }).catch((e) => {
            _log('failed to push to cloudfitnest server: '+e.message)
        })
    }
    //_log('fetched att: '+attendance.length)
    if(fAttendance.length){
        _log('new att: '+fAttendance.length)
    }else{
        if (fAttendance.length === 0 && attendance.length > 1000) {
            await zk.clearAttendanceLog();
            _log("Cleared device logs after sync safety check");
        }
    }
}
// Poll every 10 seconds
async function scheduleRun() {
    try {
        await run();
    } catch (e) {
        // _log("Run failed: " + e.message);
        _log(e);
    } finally {
        setTimeout(scheduleRun, 10000);  // Always schedule the next run
    }
}

scheduleRun();

process.on('SIGINT', async () => {
    _log('Shutting down...');
    if (zk && connected) await zk.disconnect();
    process.exit(0);
});