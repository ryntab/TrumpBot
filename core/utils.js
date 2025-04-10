import fs from 'fs';
import path from 'path';

const isDev = process.env.DEV === 'true';

export const LAST_ID_PATH = isDev
  ? path.join(process.cwd(), 'last-id.txt')
  : '/data/last-id.txt';

export const CHANNELS_PATH = isDev
  ? path.join(process.cwd(), 'channelMap.json')
  : '/data/channelMap.json';

export const channelMap = new Map();

if (fs.existsSync(CHANNELS_PATH)) {
  const saved = JSON.parse(fs.readFileSync(CHANNELS_PATH, 'utf-8'));
  for (const [guildId, channelId] of Object.entries(saved)) {
    channelMap.set(guildId, channelId);
  }
  console.log(`📂 Loaded saved channelMap from ${CHANNELS_PATH}`);
}

export function proxyImage(url) {
  return 'https://images.weserv.nl/?url=' + encodeURIComponent(url.replace(/^https?:\/\//, ''));
}
