import { client } from './core/client.js';
import { registerCommands } from './commands/slash.js';
import { startPresenceCountdown } from './core/presence.js';

client.once('ready', async () => {
  try {
    await registerCommands();
    startPresenceCountdown();
  } catch (err) {
    console.error('❌ Error during startup:', err);
    process.exit(1);
  } finally {
    console.log('✅ Bot is ready...');
  }
});