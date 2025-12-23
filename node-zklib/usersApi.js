const express = require('express');
const ZKLib = require('./zklib.js');

const app = express();
const PORT = 5005;
//const DEVICE_IP = '192.168.18.198';
const DEVICE_IP = '192.168.100.201';

// Middleware to parse JSON
app.use(express.json());

// GET /users route
app.get('/users', async (req, res) => {
    let zkInstance = null;
    
    try {
        // Create ZKLib instance and connect to device
        zkInstance = new ZKLib(DEVICE_IP, 4370, 15000, 4000);
        await zkInstance.createSocket();
        
        // Get users from the device
        const result = await zkInstance.getUsers();
        
        // Return users data
        res.json({
            success: true,
            count: result.data ? result.data.length : 0,
            users: result.data || []
        });
        
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch users from device'
        });
    } finally {
        // Disconnect from device
        if (zkInstance) {
            try {
                await zkInstance.disconnect();
            } catch (disconnectError) {
                console.error('Error disconnecting:', disconnectError);
            }
        }
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Users API server running on port ${PORT}`);
    console.log(`GET /users endpoint available at http://localhost:${PORT}/users`);
});
