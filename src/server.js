require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initRealtime } = require('./realtime');

const PORT = process.env.PORT || 8000;
const server = http.createServer(app);
initRealtime(server);

// Connect to Database
connectDB().then(() => {
    // Start Server
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
