require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 8000;

// Connect to Database
connectDB().then(() => {
    // Start Server
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
