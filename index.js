import { client } from './core/client.js';
import { checkTruths } from './services/poller.js';
import { registerCommands } from './commands/slash.js'; // or setChannel.js if that’s what you renamed
import { startPresenceCountdown } from './core/presence.js';

client.once('ready', async () => {
  console.log('Initializing...');
  try {
    await registerCommands(); // important!
    startPresenceCountdown();
    checkTruths(); // start polling
  } catch (err) {
    console.error('Error during startup:', err);
    process.exit(1); // Exit the process with a failure code
  }
});