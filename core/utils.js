import fs from 'fs';
import path from 'path';

export const LAST_ID_PATH = path.join(process.cwd(), 'last-id.txt');
export const CHANNELS_PATH = path.join(process.cwd(), 'channelMap.json');
export const channelMap = new Map();

if (fs.existsSync(CHANNELS_PATH)) {
  const saved = JSON.parse(fs.readFileSync(CHANNELS_PATH, 'utf-8'));
  for (const [guildId, channelId] of Object.entries(saved)) {
    channelMap.set(guildId, channelId);
  }
  console.log('📂 Loaded saved channelMap from file');
}

export function proxyImage(url) {
  return 'https://images.weserv.nl/?url=' + encodeURIComponent(url.replace(/^https?:\/\//, ''));
}
