const sqlite3 = require('sqlite3').verbose()
const { open } = require('sqlite')

async function connect() {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.cached.Database
    })


    const conn = await db.exec(`
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sn INT UNIQUE,
            state INT,
            user_id INT,
            bio_date DATE
        )
    `)

    // await db.exec('INSERT INTO attendance (sn,state,user_id,bio_date) VALUES (1,2,1,"2025-06-23")')
    // const row = await db.get('SELECT * FROM attendance WHERE sn = 2')
    // console.log(!!row)

    await db.exec('DELETE FROM attendance WHERE user_id > 0')
}

connect()