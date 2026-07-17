const { broadcast } = require('../realtime');
const { sendPushNotification } = require('./pushService');

const notify = (notification) => {
    broadcast(notification);
    sendPushNotification(notification).catch((error) => {
        console.error('Push notification failed:', error.message);
    });
};

module.exports = { notify };
