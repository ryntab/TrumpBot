import {
    SlashCommandBuilder,
    ChannelType,
    PermissionsBitField,
    Routes,
    REST
} from 'discord.js';
import fs from 'fs';
import { client } from '../core/client.js';
import { CHANNELS_PATH, channelMap } from '../core/utils.js';
import { checkTruths } from '../services/poller.js';

export async function registerCommands() {
    const commands = [
        new SlashCommandBuilder()
            .setName('setchannel')
            .setDescription('Set the channel where TrumpBot posts Truths')
            .addChannelOption(option =>
                option.setName('channel').setDescription('Target channel').setRequired(true)
                    .addChannelTypes(ChannelType.GuildText)
            ),
        new SlashCommandBuilder()
            .setName('refresh')
            .setDescription('Force TrumpBot to fetch Truths now (admin only)')
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), {
        body: commands.map(cmd => cmd.toJSON()),
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        // /setchannel
        if (interaction.commandName === 'setchannel') {
            const channel = interaction.options.getChannel('channel');
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return interaction.reply({ content: '🚫 No permission.', ephemeral: true });
            }

            channelMap.set(interaction.guildId, channel.id);
            fs.writeFileSync(CHANNELS_PATH, JSON.stringify(Object.fromEntries(channelMap), null, 2));

            return interaction.reply({
                content: `✅ DonBot will post Truths in ${channel}.`,
                ephemeral: true
            });
        }

        // /refresh
        if (interaction.commandName === 'refresh') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return interaction.reply({ content: '🚫 No permission to refresh.', ephemeral: true });
            }

            // 👇 Trigger your fetch logic here
            try {
                await checkTruths(true); // replace with your actual logic
                return interaction.reply({ content: '✅ Forced refresh triggered.', ephemeral: true });
            } catch (err) {
                console.error('Refresh error:', err);
                return interaction.reply({ content: '❌ Something went wrong during refresh.', ephemeral: true });
            }
        }
    });

}
