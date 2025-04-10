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

export async function registerCommands() {
    const command = new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('Set the channel where DonBot posts Truths')
        .addChannelOption(option =>
            option.setName('channel').setDescription('Target channel').setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        );

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: [command.toJSON()] });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== 'setchannel') return;

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
    });
}
