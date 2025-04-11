import express from 'express';
import imageRoute from './server/imageRoute.js';

import { client } from './core/client.js';
import { registerCommands } from './commands/slash.js';
import { startPresenceCountdown } from './core/presence.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/', imageRoute);

app.listen(PORT, () => {
  console.log(`Image generator running at http://localhost:${PORT}`);
});

// client.once('ready', async () => {
//   try {
//     await registerCommands();
//     startPresenceCountdown();
//   } catch (err) {
//     console.error('❌ Error during startup:', err);
//     process.exit(1);
//   } finally {
//     console.log('✅ Bot is ready...');
//   }
// });