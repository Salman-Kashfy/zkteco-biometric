const sqlite3 = require('sqlite3').verbose()
const { open } = require('sqlite')
const axios = require('axios');
const ZKLib = require("zkteco-js");
const moment = require("moment");
// const SERVER_URL = 'https://localhost:5000/api/biometric-attendance'
const SERVER_URL = 'https://api.cloudfitnest.com/api/biometric-attendance'
const https = require('https');
const { EventLogger } = require('node-windows');
const log = new EventLogger('zk-agent');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
* Changes based on gym
* */
const DEVICE_IP = '192.168.1.199'
const GYM_ID = '42b8ef69-4812-45d7-8192-e9cd0a64669c'
const DEVICE_BRAND = 'zkteco'
const INSTALLATION_DATE = '2025-07-28'

let zk, skipInterval = false, attendance = [], chunkSize = 15, connected = false, tableCreated = false, db = null

async function dbConn() {
    if (db) return db;
    db = await open({
        filename: './database.sqlite',
        driver: sqlite3.cached.Database
    });
    return db;
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

async function getRow(db,sn) {
    return db.get(`SELECT * FROM attendance WHERE sn = ?`, [sn]);
}

async function insertRow(db,{sn,state,userId,bioDate}) {
    return db.run(
            `INSERT INTO attendance (sn, state, user_id, bio_date) VALUES (?, ?, ?, ?)`,
        [sn, state, userId, bioDate]
    );
}

async function updateRow(db,{sn,state,userId,bioDate}) {
    return db.run(
            `UPDATE attendance SET state = ?, user_id = ?, bio_date = ? WHERE sn = ?`,
        [state, userId, bioDate, sn]
    );

}

async function run() {
    if(skipInterval) return

    db = await dbConn()

    const zk = new ZKLib(DEVICE_IP, 4370, 10000); // create inside run()
    let connected = false;
    try {
        await zk.createSocket();
        connected = true;
        //log.info("TCP connection successful");
    } catch (err) {
        log.info("Failed to connect to ZKTeco device: " + err.message);
        return;
    }

    if(!connected || !db) {
        return
    }
    if(!tableCreated){
        await createTable(db)
        tableCreated = true
    }
    const UPDATE = {}

    try {
        attendance = await zk.getAttendances()
        attendance = Array.isArray(attendance?.data) ? attendance.data : []
    } catch (e) {
        connected = false;
        return;
    }

    const fAttendance = []
    for (const att of attendance) {
        const { sn,type,state,user_id,record_time } = att
        const [bioDate, bioTime] = moment(new Date(record_time)).format('YYYY-MM-DD HH:mm:ss').split(' ')
        if (bioDate < INSTALLATION_DATE) {
            continue;
        }
        const dbRow = await getRow(db,Number(sn))
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
        skipInterval = true
        axios.post(SERVER_URL,params,{httpsAgent}).then(async (e) => {
            if(e.data.status){
                const promises = []
                for (const att of _attendance) {
                    if(UPDATE[att.sn]){
                        promises.push(updateRow(db, att))
                    } else {
                        promises.push(insertRow(db, att))
                    }
                }
                await Promise.all(promises)
            }
            skipInterval = false
        }).catch((e) => {
            log.info('failed to push to cloudfitnest server: '+e.message)
            skipInterval = false
        })
    }
    //log.info('fetched att: '+attendance.length)
    if(fAttendance.length){
        log.info('new att: '+fAttendance.length)
    }
}
// Poll every 10 seconds
async function scheduleRun() {
    try {
        await run();
    } catch (e) {
        log.error("Run failed: " + e.message);
    } finally {
        setTimeout(scheduleRun, 10000);  // Always schedule the next run
    }
}

scheduleRun();