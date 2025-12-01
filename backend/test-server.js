const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = app.listen(5000, '0.0.0.0', () => {
  console.log('✅ Test server running on port 5000');
});

console.log('Server listening?', server.listening);

setTimeout(() => {
  console.log('Server still here after 1s');
  console.log('Address:', server.address());
}, 1000);

setInterval(() => {
  console.log('Keepalive ping...');
}, 5000);
