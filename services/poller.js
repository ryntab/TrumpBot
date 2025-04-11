// services/truthFetcher.js

import { client } from '../core/client.js';
import {
  channelMap,
  proxyImage,
  SENT_IDS_PATH,
  sentTruthIds,
} from '../core/utils.js';
import { updatePresenceWithNextPoll } from '../core/presence.js';
import { scheduleNextCheck } from '../core/schedule.js';
import fs from 'fs';
import { fetch } from 'undici';
import { HeaderGenerator } from 'header-generator';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

const userID = '107780257626128497';

const headerGenerator = new HeaderGenerator({
  browsers: [{ name: 'chrome', minVersion: 99 }],
  devices: ['desktop'],
  operatingSystems: ['windows']
});

const headers = {
  ...headerGenerator.getHeaders(),
  Accept: 'application/json',
  Referer: 'https://truthsocial.com/',
  Origin: 'https://truthsocial.com',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty'
};

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
      activities: [{ name: 'Searching for Truths…', type: 4 }],
      status: 'online'
    });

    const res = await fetch(
      `http://api.scrape.do?token=${process.env.SCRAPE_DO_TOKEN}&url=https://truthsocial.com/api/v1/accounts/${userID}/statuses`,
      { headers }
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
        activities: [{ name: 'Standing by for Truths', type: 4 }],
        status: 'online'
      });
      scheduleNextCheck(checkTruths);
      return;
    }

    // ✅ Sort oldest to newest
    newTruths.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    console.log(`✅ ${newTruths.length} new Truth(s) queued for delivery.`);

    for (const truth of newTruths) {
      sentTruthIds.add(truth.id); // mark as sent
      const media = truth.media_attachments?.[0];
      const content = truth.content.replace(/<[^>]*>/g, '').trim();
      const timestampUnix = Math.floor(new Date(truth.created_at).getTime() / 1000);
      const relativeTime = `<t:${timestampUnix}:R>`;
      const statsLine = `💬 ${truth.replies_count.toLocaleString()}  🔁 ${truth.reblogs_count.toLocaleString()}  ❤️ ${truth.favourites_count.toLocaleString()}`;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `@${truth.account.username}`,
          iconURL: proxyImage(truth.account.avatar),
          url: `https://truthsocial.com/@${truth.account.username}`
        })
        .setURL(`https://truthsocial.com/@realDonaldTrump/${truth.id}`)
        .setColor(0xff9900)
        .setTimestamp(new Date(truth.created_at))
        .setFooter({
          text: `${statsLine} — Truth Social`,
          iconURL: proxyImage(
            'https://static-assets-1.truthsocial.com/tmtg:prime-ts-assets/site_uploads/files/000/000/035/original/Truth_Social_Profile_Icon.png'
          )
        });

      if (content !== '') embed.setDescription(content + '\n\n' + relativeTime);
      if (media?.preview_url) embed.setImage(proxyImage(media.preview_url));

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('🔗 View on Truth Social')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://truthsocial.com/@realDonaldTrump/${truth.id}`)
      );

      if (media?.type === 'video') {
        buttonRow.addComponents(
          new ButtonBuilder()
            .setLabel('▶️ Watch Video')
            .setStyle(ButtonStyle.Link)
            .setURL(truth.uri)
        );
      }

      for (const [guildId, channelId] of channelMap.entries()) {
        if (targetGuildId && guildId !== targetGuildId) continue;
        
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) continue;

        await channel.send({
          embeds: [embed],
          components: [buttonRow]
        });
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

