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
    const enriched = {
        ...message,
        id: message.id || (message.type === 'notification' ? `${Date.now()}-${Math.random().toString(36).slice(2)}` : undefined),
        at: new Date().toISOString()
    };
    const payload = JSON.stringify(enriched);
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
