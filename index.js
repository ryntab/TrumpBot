import { client } from './core/client.js';
import { checkTruths } from './services/poller.js';
import { registerCommands } from './commands/slash.js'; // or setChannel.js if that’s what you renamed
import { startPresenceCountdown } from './core/presence.js';

client.once('ready', async () => {
  console.log('⚙️ Initializing...');
  try {
    await registerCommands(); // important!
    console.log('✅ Commands registered');
    
    startPresenceCountdown();
    console.log('🚀 Presence countdown started');

    // checkTruths(); // start polling
    console.log('🏁 Ready!');
  } catch (err) {
    console.error('❌ Error during startup:', err);
    process.exit(1);
  }
});