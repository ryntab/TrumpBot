// =====================
// 📦 Imports & Setup
// =====================
import { HeaderGenerator } from 'header-generator';
import { fetch } from 'undici'; // still using fetch, but with spoofed headers
import fs from 'fs';
import path from 'path';

const LAST_ID_PATH = path.join(process.cwd(), 'last-id.txt');
const CHANNELS_PATH = path.join(process.cwd(), 'channelMap.json');
const channelMap = new Map(); // guildId => channelId

let inBurstMode = false;
let burstTimeout = null;
let nextPollTime = null;

let lastSentId = null;

if (fs.existsSync(LAST_ID_PATH)) {
    lastSentId = fs.readFileSync(LAST_ID_PATH, 'utf-8').trim();
    console.log(`🧠 Last sent ID loaded from file: ${lastSentId}`);
}

// Load from file if exists
if (fs.existsSync(CHANNELS_PATH)) {
    const saved = JSON.parse(fs.readFileSync(CHANNELS_PATH, 'utf-8'));
    for (const [guildId, channelId] of Object.entries(saved)) {
        channelMap.set(guildId, channelId);
    }
    console.log('📂 Loaded saved channelMap from file');
}

import {
    AttachmentBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ButtonBuilder,
    Client,
    EmbedBuilder,
    GatewayIntentBits,
    Partials,
    Routes,
    REST,
    SlashCommandBuilder,
    ChannelType,
    PermissionsBitField
} from 'discord.js';
import dotenv from 'dotenv';
import { url } from 'inspector';

dotenv.config();

// =====================
// 🌍 Global Variable
// ===================
const userID = '107780257626128497'; // Trump’s user ID on Truth Social

const headerGenerator = new HeaderGenerator({
    browsers: [{ name: 'chrome', minVersion: 99 }],
    devices: ['desktop'],
    operatingSystems: ['windows']
});

const headers = {
    ...headerGenerator.getHeaders(),
    'Accept': 'application/json',
    'Referer': 'https://truthsocial.com/',
    'Origin': 'https://truthsocial.com',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty'
};

// =====================
// 🤖 Bot Client Config
// =====================
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel]
});

// =====================
// 🔧 Slash Command Setup
// =====================
const commands = [
    new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('Set the channel where DonBot will post Trump’s Truths')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Select a text channel')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// =====================
// ✅ Bot Ready
// =====================
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('🛠️ Slash commands registered');
    } catch (err) {
        console.error('❌ Failed to register slash commands:', err);
    }

    startPresenceCountdown();
    checkTruths(); // Initial check
});

// =====================
// 📥 When Bot Joins a Server
// =====================
client.on('guildCreate', async guild => {
    const firstChannel = guild.channels.cache
        .filter(ch =>
            ch.type === ChannelType.GuildText &&
            ch.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages)
        )
        .first();

    if (!firstChannel) return;

    await firstChannel.send(
        '👋 Thanks for adding me! To finish setup, an admin should run `/setchannel` to choose where I’ll post Trump’s Truths.'
    );
});

// =====================
// ⚙️ Handle Slash Commands
// =====================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'setchannel') {
        const channel = interaction.options.getChannel('channel');

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: '🚫 You need **Manage Server** permission to use this.',
                ephemeral: true
            });
        }

        channelMap.set(interaction.guildId, channel.id);

        // Save updated map to file
        const obj = Object.fromEntries(channelMap.entries());
        fs.writeFileSync(CHANNELS_PATH, JSON.stringify(obj, null, 2));

        return interaction.reply({
            content: `✅ DonBot will now post Truths in ${channel}.`,
            ephemeral: true
        });
    }
});

const proxyImage = (url) => {
    return 'https://images.weserv.nl/?url=' + encodeURIComponent(url.replace(/^https?:\/\//, ''));
}

function scheduleNextCheck(delay = getAdjustedPollingDelay()) {
    clearTimeout(burstTimeout);
    nextPollTime = Date.now() + delay;
    burstTimeout = setTimeout(checkTruths, delay);
}

function getAdjustedPollingDelay() {
    const hourUTC = new Date().getUTCHours();

    // Sleep mode: 5AM to 8AM UTC → poll every 3 hours
    if (hourUTC >= 5 && hourUTC < 8) {
        console.log('🌙 Low activity hours — polling every 3 hours.');
        return 3 * 60 * 60 * 1000; // 3 hours
    }

    // Default: 45 minutes
    return 45 * 60 * 1000;
}

function formatDiscordTimestamp(dateString) {
    const timestamp = Math.floor(new Date(dateString).getTime() / 1000);
    return `<t:${timestamp}:f>`; // shows formatted date like "Apr 10, 2025 5:32 PM"
}

function updatePresenceWithNextPoll() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    let nextPoll;

    if (utcHour >= 5 && utcHour < 8) {
        // Sleeping hours
        nextPoll = new Date(now.getTime() + 3 * 60 * 60 * 1000);
        client.user.setPresence({
            activities: [{
                name: `Sleeping 💤 • Next check <t:${Math.floor(nextPoll.getTime() / 1000)}:R>`,
                type: 4
            }],
            status: 'idle'
        });
    } else {
        // Normal polling
        nextPoll = new Date(now.getTime() + 45 * 60 * 1000);
        client.user.setPresence({
            activities: [{
                name: `Next check <t:${Math.floor(nextPoll.getTime() / 1000)}:R>`,
                type: 4
            }],
            status: 'online'
        });
    }
}

function startPresenceCountdown() {
    setInterval(() => {
        if (!nextPollTime) return;

        const diff = nextPollTime - Date.now();
        if (diff <= 0) return;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let timeStr = '';
        if (hours > 0) timeStr += `${hours}h `;
        if (minutes > 0 || hours > 0) timeStr += `${minutes}m `;
        timeStr += `${seconds}s`;

        const sleeping = isSleepingHours();
        const statusText = sleeping ? `Sleeping 💤 | Next check in ${timeStr}` : `Next check in ${timeStr}`;

        client.user.setPresence({
            activities: [{ name: statusText.trim(), type: 4 }],
            status: sleeping ? 'idle' : 'online'
        });
    }, 15000); // update every second
}

function isSleepingHours() {
    const utcHour = new Date().getUTCHours();
    return utcHour >= 5 && utcHour < 8;
}


// =====================
// 📡 Polling Logic
// =====================
async function checkTruths() {
    try {
        client.user.setPresence({
            activities: [{ name: 'Searching for Truths…', type: 4 }],
            status: 'online'
        });

        const res = await fetch(
            `http://api.scrape.do?token=b2aecb60a2f04b4a87c09ba1934a75922b652f19c19&url=https://truthsocial.com/api/v1/accounts/${userID}/statuses`,
            { headers }
        );

        const data = await res.json();
        const newest = data[0]; // usually [0] is the latest, not [4]

        // No new Truth — standby and schedule next
        if (!newest || newest.id === lastSentId) {
            client.user.setPresence({
                activities: [{ name: 'Standing by for Truths', type: 4 }],
                status: 'online'
            });

            inBurstMode = false;
            scheduleNextCheck(); // ✅ make sure this runs here!
            return;
        }

        // New Truth found
        lastSentId = newest.id;
        fs.writeFileSync(LAST_ID_PATH, lastSentId); // ✅ Save it
        inBurstMode = true;

        client.user.setPresence({
            activities: [{ name: 'Posting a new Truth!', type: 4 }],
            status: 'online'
        });

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
            .setColor(0xFF9900)
            .setTimestamp(new Date(newest.created_at))
            .setFooter({
                text: `${statsLine} — Truth Social`,
                iconURL: proxyImage('https://static-assets-1.truthsocial.com/tmtg:prime-ts-assets/site_uploads/files/000/000/035/original/Truth_Social_Profile_Icon.png')
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
                    .setURL(media.url)
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

        // Done posting — return to standby
        client.user.setPresence({
            activities: [{ name: 'Standing by for Truths', type: 4 }],
            status: 'online'
        });

        // ✅ Burst mode: recheck sooner
        console.log('🚨 Burst mode: checking again in 2 minutes...');
        scheduleNextCheck(2 * 60 * 1000);
        updatePresenceWithNextPoll();

    } catch (err) {
        console.error('❌ Error fetching Truths:', err);
        client.user.setPresence({
            activities: [{ name: 'Error connecting to Truth Social', type: 4 }],
            status: 'dnd'
        });

        // Still schedule next check even if error
        scheduleNextCheck();
    }
}

// =====================
// 🚀 Start Bot
// =====================
client.login(process.env.TOKEN);
