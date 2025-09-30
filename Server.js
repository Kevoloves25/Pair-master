// Simple HTTP server for platforms that require it
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🤖 Telegram Bot Pairing Hub is running!\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Import your bot (make sure index.js exports bot instance)
require('./index');
