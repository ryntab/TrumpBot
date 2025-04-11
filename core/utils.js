import fs from 'fs';
import path from 'path';

const isDev = process.env.DEV === 'true';

const DEFAULT_USER_ID = '107780257626128497';
export const USER_ID = process.env.TRUTH_USER_ID || DEFAULT_USER_ID;

console.log(USER_ID)

export const SENT_IDS_PATH = isDev
  ? path.join(process.cwd(), 'sent-truth-ids.json')
  : '/data/sent-truth-ids.json';

export const sentTruthIds = new Set();

if (fs.existsSync(SENT_IDS_PATH)) {
  const saved = JSON.parse(fs.readFileSync(SENT_IDS_PATH, 'utf-8'));
  for (const id of saved) {
    sentTruthIds.add(id);
  }
  console.log(`🧠 Loaded ${sentTruthIds.size} previously sent Truth IDs`);
}

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
