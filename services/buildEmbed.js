// services/buildEmbed.js
import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { proxyImage } from '../core/utils.js';


export function buildEmbedsFromTruth(truth) {
    const media = truth.media_attachments?.[0];
    const content = truth.content.replace(/<[^>]*>/g, '').trim();

    let fullDescription = content;

    if (!fullDescription && media?.type === 'video') {
        fullDescription = `${truth.account.display_name} Shared a Video`;
    }

    const timestamp = new Date(truth.created_at);
    const relativeTime = `<t:${Math.floor(timestamp.getTime() / 1000)}:R>`;
    const stats = `💬 ${truth.replies_count.toLocaleString()}  🔁 ${truth.reblogs_count.toLocaleString()}  ❤️ ${truth.favourites_count.toLocaleString()}`;


    // Append card info
    if (truth.card?.title) fullDescription += `\n\n**${truth.card.title}**`;
    if (truth.card?.description) fullDescription += `\n${truth.card.description}`;
    fullDescription += `\n\n${relativeTime}`;

    const mainEmbed = new EmbedBuilder()
        .setAuthor({
            name: `@${truth.account.username}`,
            iconURL: proxyImage(truth.account.avatar),
            url: `https://truthsocial.com/@${truth.account.username}`
        })
        .setURL(`https://truthsocial.com/@${truth.account.username}/${truth.id}`)
        .setColor(0xff9900)
        .setTimestamp(timestamp)
        .setFooter({
            text: `${stats} — Truth Social`,
            iconURL: proxyImage('https://static-assets-1.truthsocial.com/tmtg:prime-ts-assets/site_uploads/files/000/000/035/original/Truth_Social_Profile_Icon.png')
        })
        .setDescription(fullDescription);

    // Set image: media > card > (later quote fallback)
    if (media?.preview_url) {
        mainEmbed.setThumbnail(proxyImage(media.preview_url));
    } else if (truth.card?.image) {
        mainEmbed.setThumbnail(proxyImage(truth.card.image));
    }

    mainEmbed.setImage(proxyImage('https://raw.githubusercontent.com/ryntab/TrumpBot/refs/heads/master/assets/Discord-Trump-Decoration-Alt.png'));

    const embeds = [mainEmbed];

    // Handle quoted or reblogged Truth
    const attached = truth.quote || truth.reblog;
    if (attached) {
        const isSelf = attached.account.id === truth.account.id;
        const attachedContent = attached.content.replace(/<[^>]*>/g, '').trim();
        const attachedUrl = `https://truthsocial.com/@${attached.account.username}/${attached.id}`;

        if (isSelf) {
            // Inline into main embed
            if (attachedContent) mainEmbed.setDescription(mainEmbed.data.description + `\n\n> ${attachedContent}`);
            if (!mainEmbed.data.image) {
                if (attached.media_attachments?.[0]?.preview_url) {
                    mainEmbed.setImage(proxyImage(attached.media_attachments[0].preview_url));
                } else if (attached.card?.image) {
                    mainEmbed.setImage(proxyImage(attached.card.image));
                }
            }
            if (attached.card?.title) mainEmbed.setDescription(mainEmbed.data.description + `\n\n**${attached.card.title}**`);
            if (attached.card?.description) mainEmbed.setDescription(mainEmbed.data.description + `\n${attached.card.description}`);
        } else {
            const quoteEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `@${attached.account.username}`,
                    iconURL: proxyImage(attached.account.avatar),
                    url: `https://truthsocial.com/@${attached.account.username}`
                })
                .setURL(attachedUrl)
                .setColor(0x99b9ff)
                .setTimestamp(new Date(attached.created_at))
                .setFooter({ text: truth.quote ? 'Quoted Truth — Truth Social' : 'Reblogged Truth — Truth Social' });

            if (attachedContent) quoteEmbed.setDescription(attachedContent);
            if (attached.media_attachments?.[0]?.preview_url) {
                quoteEmbed.setImage(proxyImage(attached.media_attachments[0].preview_url));
            } else if (attached.card?.image) {
                quoteEmbed.setImage(proxyImage(attached.card.image));
            }

            embeds.push(quoteEmbed);
        }
    }

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('🔗 View on Truth Social')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://truthsocial.com/@${truth.account.username}/${truth.id}`)
    );

    if (media?.type === 'video') {
        buttonRow.addComponents(
            new ButtonBuilder()
                .setLabel('▶️ Watch Video')
                .setStyle(ButtonStyle.Link)
                .setURL(truth.uri)
        );
    }

    return {
        embeds,
        components: [buttonRow]
    };
}
