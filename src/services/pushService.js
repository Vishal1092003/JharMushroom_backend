const User = require('../models/User');
const { getMessaging } = require('../config/firebase');

const invalidTokenCodes = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered'
]);

const collectRecipientUsers = async (notification) => {
    if (notification.audience === 'user' && notification.userId) {
        return User.find({ _id: notification.userId }).select('fcmTokens');
    }
    if (notification.audience === 'admin') {
        return User.find({
            $or: [{ role: 'admin' }, { isAdmin: true }]
        }).select('fcmTokens');
    }
    if (notification.audience === 'all') {
        return User.find({}).select('fcmTokens');
    }
    return [];
};

const removeInvalidTokens = async (tokens) => {
    if (tokens.length === 0) return;
    await User.updateMany(
        { 'fcmTokens.token': { $in: tokens } },
        { $pull: { fcmTokens: { token: { $in: tokens } } } }
    );
};

const sendPushNotification = async (notification) => {
    const messaging = getMessaging();
    if (!messaging) return;

    const users = await collectRecipientUsers(notification);
    const tokens = [
        ...new Set(
            users.flatMap((user) => (user.fcmTokens || []).map((entry) => entry.token).filter(Boolean))
        )
    ];
    if (tokens.length === 0) return;

    const invalidTokens = [];
    const chunks = [];
    for (let i = 0; i < tokens.length; i += 500) {
        chunks.push(tokens.slice(i, i + 500));
    }

    for (const chunk of chunks) {
        const response = await messaging.sendEachForMulticast({
            tokens: chunk,
            notification: {
                title: notification.title || 'Mushroom Mart',
                body: notification.body || ''
            },
            data: {
                type: notification.type || 'notification',
                audience: notification.audience || '',
                category: notification.category || 'general',
                entityType: notification.entityType || '',
                entityId: notification.entityId || '',
                userId: notification.userId || ''
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'app_updates',
                    clickAction: 'OPEN_MAIN_ACTIVITY'
                }
            }
        });

        response.responses.forEach((result, index) => {
            const code = result.error?.code;
            if (code && invalidTokenCodes.has(code)) {
                invalidTokens.push(chunk[index]);
            } else if (result.error) {
                console.error('FCM send failed:', result.error.message);
            }
        });
    }

    await removeInvalidTokens(invalidTokens);
};

module.exports = { sendPushNotification };
