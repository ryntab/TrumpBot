// services/truthFetcher.js

import { client } from '../core/client.js';
import { channelMap, proxyImage, LAST_ID_PATH } from '../core/utils.js';
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

let lastSentId = null;
if (fs.existsSync(LAST_ID_PATH)) {
  lastSentId = fs.readFileSync(LAST_ID_PATH, 'utf-8').trim();
}

export async function checkTruths() {
  console.log('🔄 Checking for new Truths...');
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
    const newest = data[0];

    if (!newest || newest.id === lastSentId) {
      console.log('🤷🏻 No new Truths found. Waiting for the next check...');
      client.user.setPresence({
        activities: [{ name: 'Standing by for Truths', type: 4 }],
        status: 'online'
      });
      scheduleNextCheck(checkTruths);
      return;
    }

    lastSentId = newest.id;
    fs.writeFileSync(LAST_ID_PATH, lastSentId);

    const media = newest.media_attachments?.[0];
    const content = newest.content.replace(/<[^>]*>/g, '').trim();
    const timestampUnix = Math.floor(new Date(newest.created_at).getTime() / 1000);
    const relativeTime = `<t:${timestampUnix}:R>`;
    const statsLine = `💬 ${newest.replies_count.toLocaleString()}  🔁 ${newest.reblogs_count.toLocaleString()}  ❤️ ${newest.favourites_count.toLocaleString()}`;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `@${newest.account.username}`,
        iconURL: proxyImage(newest.account.avatar),
        url: `https://truthsocial.com/@${newest.account.username}`
      })
      .setURL(`https://truthsocial.com/@realDonaldTrump/${newest.id}`)
      .setColor(0xff9900)
      .setTimestamp(new Date(newest.created_at))
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
        .setURL(`https://truthsocial.com/@realDonaldTrump/${newest.id}`)
    );

    if (media?.type === 'video') {
      embed.setImage(proxyImage(media.preview_url));
      buttonRow.addComponents(
        new ButtonBuilder()
          .setLabel('▶️ Watch Video')
          .setStyle(ButtonStyle.Link)
          .setURL(newest.uri)
      );
    }

    for (const [guildId, channelId] of channelMap.entries()) {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) continue;

      await channel.send({
        embeds: [embed],
        components: [buttonRow]
      });
    }

    client.user.setPresence({
      activities: [{ name: 'Standing by for Truths', type: 4 }],
      status: 'online'
    });

    scheduleNextCheck(checkTruths, 2 * 60 * 1000); // Burst mode check
    updatePresenceWithNextPoll();
  } catch (err) {
    console.error('❌ Error fetching Truths:', err);
    client.user.setPresence({
      activities: [{ name: 'Error connecting to Truth Social', type: 4 }],
      status: 'dnd'
    });
    scheduleNextCheck(checkTruths);
  }
}