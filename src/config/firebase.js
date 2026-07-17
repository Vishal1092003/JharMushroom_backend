const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getMessaging: getFirebaseMessaging } = require('firebase-admin/messaging');

let attemptedInit = false;

const getMessaging = () => {
    if (getApps().length > 0) {
        return getFirebaseMessaging();
    }

    if (attemptedInit) {
        return null;
    }
    attemptedInit = true;

    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : null;

        if (projectId && clientEmail && privateKey) {
            initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey
                })
            });
            return getFirebaseMessaging();
        }

        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            initializeApp({
                credential: applicationDefault()
            });
            return getFirebaseMessaging();
        }

        console.warn('Firebase Admin is not configured. FCM push notifications are disabled.');
        return null;
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error.message);
        return null;
    }
};

module.exports = { getMessaging };
