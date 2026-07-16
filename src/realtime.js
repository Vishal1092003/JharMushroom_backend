const { WebSocketServer } = require('ws');

let wss;

const initRealtime = (server) => {
    wss = new WebSocketServer({ server, path: '/realtime' });

    wss.on('connection', (socket) => {
        socket.send(JSON.stringify({ type: 'connected' }));
    });

    return wss;
};

const broadcast = (message) => {
    if (!wss) return;
    const payload = JSON.stringify({ ...message, at: new Date().toISOString() });
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(payload);
        }
    });
};

module.exports = {
    initRealtime,
    broadcast
};
