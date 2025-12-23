const ZKLib = require('./node-zklib/zklib.js')
const { COMMANDS } = require('./node-zklib/constants')

const DEVICE_IP = '192.168.18.198';
const DEVICE_PORT = 4370;

/**
 * Creates a user data buffer (72 bytes) for ZKTeco device
 * @param {number} uid - User serial number (2 bytes)
 * @param {number} role - User role (1 byte, default 0)
 * @param {string} password - Password (max 8 bytes, default empty)
 * @param {string} name - User name (max 24 bytes)
 * @param {number} cardno - Card number (4 bytes, default 0)
 * @param {string} userId - User ID string (max 9 bytes)
 */
function createUserBuffer(uid, role = 0, password = '', name = '', cardno = 0, userId = '') {
    const buffer = Buffer.alloc(72); // User data is 72 bytes
    
    // uid (2 bytes, little-endian)
    buffer.writeUInt16LE(uid, 0);
    
    // role (1 byte)
    buffer.writeUInt8(role, 2);
    
    // password (8 bytes, null-terminated)
    const passwordBuf = Buffer.from(password.substring(0, 8), 'ascii');
    passwordBuf.copy(buffer, 3);
    
    // name (starts at offset 11, max ~24 bytes to leave room for cardno)
    const nameBuf = Buffer.from(name.substring(0, 24), 'ascii');
    nameBuf.copy(buffer, 11);
    
    // cardno (4 bytes at offset 35, little-endian)
    buffer.writeUInt32LE(cardno, 35);
    
    // userId (9 bytes at offset 48, null-terminated)
    const userIdBuf = Buffer.from(userId.substring(0, 9), 'ascii');
    userIdBuf.copy(buffer, 48);
    
    return buffer;
}

/**
 * Gets the next available user ID by checking existing users
 */
async function getNextUserId(zk) {
    try {
        const usersResult = await zk.getUsers();
        const users = usersResult.data || [];
        
        if (users.length === 0) {
            return { uid: 1, userId: '1' };
        }
        
        // Find maximum uid and userId
        let maxUid = 0;
        let maxUserId = 0;
        
        for (const user of users) {
            if (user.uid && user.uid > maxUid) {
                maxUid = user.uid;
            }
            if (user.userId) {
                const numUserId = parseInt(user.userId, 10);
                if (!isNaN(numUserId) && numUserId > maxUserId) {
                    maxUserId = numUserId;
                }
            }
        }
        
        // Return next available ID (use max of uid or userId + 1)
        const nextId = Math.max(maxUid, maxUserId) + 1;
        return { uid: nextId, userId: nextId.toString() };
    } catch (err) {
        console.error('Error getting existing users, using default ID:', err.message);
        return { uid: 1, userId: '1' };
    }
}

async function createUser(userName = '', password = '', role = 0, cardno = 0, customUserId = null) {
    const zk = new ZKLib(DEVICE_IP, 4370, 10000, 4000);
    await zk.createSocket();
    try {
        console.log('Connected successfully');

        zk.getUs
        
        // Auto-generate user ID if not provided
        let uid, userId;
        if (customUserId !== null) {
            uid = typeof customUserId === 'number' ? customUserId : parseInt(customUserId, 10);
            userId = customUserId.toString();
        } else {
            const nextIds = await getNextUserId(zk);
            uid = nextIds.uid;
            userId = nextIds.userId;
        }
        
        console.log(`Creating user with UID: ${uid}, UserID: ${userId}, Name: ${userName || '(empty)'}`);
        
        // Create user data buffer
        const userBuffer = createUserBuffer(uid, role, password, userName, cardno, userId);
        
        // Use CMD_USER_WRQ (command 8) to set/create user
        const res = await zk.executeCmd(COMMANDS.CMD_USER_WRQ, userBuffer);
        
        console.log('User created successfully!', { res });
        return { success: true, uid, userId, userName };
    } catch (err) {
        console.error('Error during user creation:', err);
        return { success: false, error: err.message };
    } finally {
        await zk.disconnect();
    }
}

// Example usage:
// createUser('John Doe', '', 0, 0); // Auto-generate ID
// createUser('Jane Doe', '12345678', 0, 0, 100); // Custom ID 100

createUser('Test User 1'); // Create user with auto-generated ID