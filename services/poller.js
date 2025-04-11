// services/truthFetcher.js

import { client } from '../core/client.js';
import {
  channelMap,
  proxyImage,
  USER_ID,
  SENT_IDS_PATH,
  sentTruthIds,
} from '../core/utils.js';
import { buildEmbedsFromTruth } from './buildEmbed.js';
import { updatePresenceWithNextPoll } from '../core/presence.js';
import { scheduleNextCheck } from '../core/schedule.js';
import fs from 'fs';
import { fetch } from 'undici';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';


let isPolling = false;

export async function checkTruths(force, targetGuildId = null) {

  if (force && targetGuildId) {
    console.log(`🔄 Forcing check for new Truths in guild: ${targetGuildId}`);
  } 

  if (isPolling) {
    console.log('⏱️ Poll already running, skipping...');
    return;
  }

  console.log('🔄 Checking for new Truths...');
  isPolling = true;

  try {
    client.user.setPresence({
      activities: [{ name: 'Scanning for Truths...', type: 4 }],
      status: 'online'
    });

    const res = await fetch(
      `http://api.scrape.do?token=${process.env.SCRAPE_DO_TOKEN}&url=https://truthsocial.com/api/v1/accounts/${USER_ID}/statuses`
    );

    const data = await res.json();
    console.log('📜 Fetched Truths:', data.length, 'Truths found.');
    console.log(`📂 Current sentTruthIds has ${sentTruthIds.size} entries`);

    // ✅ Filter out already-sent posts
    const newTruths = data.filter(truth => !sentTruthIds.has(truth.id));
    for (const truth of data) {
      if (sentTruthIds.has(String(truth.id))) {
        console.log(`🔁 Skipping known Truth ID: ${truth.id}`);
      }
    }

    if (newTruths.length === 0) {
      console.log('- No new Truths found. Waiting for the next check...');
      client.user.setPresence({
        activities: [{ name: 'Nothing new yet...', type: 4 }],
        status: 'online'
      });
      scheduleNextCheck(checkTruths);
      return;
    }

    // ✅ Sort oldest to newest
    newTruths.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    console.log(`✅ ${newTruths.length} new Truth(s) queued for delivery.`);

    for (const truth of newTruths) {
      sentTruthIds.add(truth.id);
      const { embeds, components } = buildEmbedsFromTruth(truth);
    
      for (const [guildId, channelId] of channelMap.entries()) {
        if (targetGuildId && guildId !== targetGuildId) continue;
    
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) continue;
    
        await channel.send({ embeds, components });
      }
    }

    // ✅ Save sent IDs and latest post ID
    fs.writeFileSync(SENT_IDS_PATH, JSON.stringify([...sentTruthIds], null, 2));
    client.user.setPresence({
      activities: [{ name: 'Standing by for Truths', type: 4 }],
      status: 'online'
    });

    scheduleNextCheck(checkTruths, 2 * 60 * 1000); // 2-minute burst interval
    updatePresenceWithNextPoll();

  } catch (err) {
    console.error('❌ Error fetching Truths:', err);
    client.user.setPresence({
      activities: [{ name: 'Error connecting to Truth Social', type: 4 }],
      status: 'dnd'
    });
    scheduleNextCheck(checkTruths);
  } finally {
    isPolling = false;
  }
}

