const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { baseEmbed, successEmbed, errorEmbed, warnEmbed } = require('../utils/embeds');
const { getFile, putFile } = require('../utils/github');

const SLIDESHOW_PATH = 'data/slideshow/info.json';

// In-memory session store: userId -> { slides, sha, page }
const sessions = new Map();

// ── Helpers ──────────────────────────────────────────────────────────────────

const SITE_BASE = 'https://phsrambots.org';

/**
 * Resolves an image path to a full URL Discord can embed.
 * Local paths like /data/slideshow/foo.webp become https://phsrambots.org/data/slideshow/foo.webp
 * Returns null if the result isn't a valid URL (so we skip setImage safely).
 */
function resolveImageUrl(img) {
  if (!img) return null;
  let url;
  if (img.startsWith('http://') || img.startsWith('https://')) {
    url = img;
  } else {
    url = SITE_BASE + (img.startsWith('/') ? img : '/' + img);
  }
  // Validate — Discord will reject anything that isn't a well-formed URL
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

function buildSlideEmbed(slide, index, total) {
  const isActive = slide.active === true || slide.active === undefined ? false : false;
  const activeVal = slide.active === true ? '✅ Yes' : slide.active === false ? '❌ No' : '❓ Unset (defaults to inactive)';

  const imgUrl = resolveImageUrl(slide.img);
  const imgDisplay = slide.img || '(none)';

  const embed = baseEmbed(
    `🖼  Slideshow Editor  (${index + 1} / ${total})`,
    `**${slide.header || '(no header)'}**\n${slide.description || '(no description)'}`
  )
    .addFields(
      { name: '🔗 Link',     value: slide.href   || '(none)', inline: true  },
      { name: '📝 Alt Text', value: slide.alt    || '(none)', inline: true  },
      { name: '\u200B',      value: '\u200B',                 inline: true  }, // spacer
      { name: '🖼 Image Path', value: `\`${imgDisplay}\``,   inline: false },
      { name: '👁 Active',   value: activeVal,               inline: true  },
    );

  // Always resolves to a URL (local paths get phsrambots.org prepended)
  // Guard: only call setImage if it's a valid absolute URL — Discord rejects anything else
  if (imgUrl && imgUrl.startsWith('https://')) {
    embed.setImage(imgUrl);
  }

  return embed;
}

// Two rows of buttons — Discord allows max 5 per row
function buildButtonRows(page, total, activeState) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ss_prev')
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('ss_next')
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === total - 1),
    new ButtonBuilder()
      .setCustomId('ss_toggle_active')
      .setLabel(activeState === true ? '👁 Set Inactive' : '👁 Set Active')
      .setStyle(activeState === true ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ss_edit')
      .setLabel('✏️ Edit')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ss_delete')
      .setLabel('🗑 Delete')
      .setStyle(ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ss_push')
      .setLabel('✔ Save & Push')
      .setStyle(ButtonStyle.Success),
  );

  return [row1, row2];
}

// ── Command ───────────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit-slideshow')
    .setDescription('View and edit the PHS Rambots website slideshow.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    let slides, sha;
    try {
      const file = await getFile(SLIDESHOW_PATH);
      if (!file) return interaction.editReply({ embeds: [errorEmbed('Not Found', `Could not find \`${SLIDESHOW_PATH}\` in the repository.`)] });
      slides = JSON.parse(file.content);
      sha = file.sha;
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed('GitHub Error', `\`${err.message}\``)] });
    }

    const page = 0;
    sessions.set(interaction.user.id, { slides, sha, page });

    await interaction.editReply({
      embeds: [buildSlideEmbed(slides[page], page, slides.length)],
      components: buildButtonRows(page, slides.length, slides[page].active),
    });
  },

  // ── Interaction Router ────────────────────────────────────────────────────

  async handleInteraction(interaction) {
    const uid = interaction.user.id;

    // ── Buttons ──────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      const session = sessions.get(uid);
      if (!session) {
        return interaction.reply({ embeds: [errorEmbed('Session Expired', 'Please run `/edit-slideshow` again.')], ephemeral: true });
      }

      const { slides, sha, page } = session;

      if (interaction.customId === 'ss_prev') {
        const newPage = Math.max(0, page - 1);
        session.page = newPage;
        return interaction.update({
          embeds: [buildSlideEmbed(slides[newPage], newPage, slides.length)],
          components: buildButtonRows(newPage, slides.length, slides[newPage].active),
        });
      }

      if (interaction.customId === 'ss_next') {
        const newPage = Math.min(slides.length - 1, page + 1);
        session.page = newPage;
        return interaction.update({
          embeds: [buildSlideEmbed(slides[newPage], newPage, slides.length)],
          components: buildButtonRows(newPage, slides.length, slides[newPage].active),
        });
      }

      if (interaction.customId === 'ss_toggle_active') {
        const slide = slides[page];
        // Toggle: if active is true set false, otherwise set true
        slide.active = slide.active !== true;
        return interaction.update({
          embeds: [buildSlideEmbed(slide, page, slides.length)],
          components: buildButtonRows(page, slides.length, slide.active),
        });
      }

      if (interaction.customId === 'ss_edit') {
        const slide = slides[page];
        const modal = new ModalBuilder()
          .setCustomId('ss_edit_modal')
          .setTitle(`Edit Slide ${page + 1} of ${slides.length}`);

        const fields = [
          { id: 'header',      label: 'Header',                     value: slide.header      || '', style: TextInputStyle.Short     },
          { id: 'description', label: 'Description',                value: slide.description || '', style: TextInputStyle.Paragraph },
          { id: 'href',        label: 'Link (href)',                 value: slide.href        || '', style: TextInputStyle.Short     },
          { id: 'img',         label: 'Image path or URL',          value: slide.img         || '', style: TextInputStyle.Short     },
          { id: 'alt',         label: 'Alt text',                   value: slide.alt         || '', style: TextInputStyle.Short     },
        ];

        modal.addComponents(
          ...fields.map(f =>
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId(f.id)
                .setLabel(f.label)
                .setValue(f.value)
                .setStyle(f.style)
                .setRequired(false)
            )
          )
        );

        return interaction.showModal(modal);
      }

      if (interaction.customId === 'ss_delete') {
        const modal = new ModalBuilder()
          .setCustomId('ss_delete_modal')
          .setTitle('Confirm Deletion');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('confirm')
              .setLabel('Type YES to confirm deletion of this slide')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      if (interaction.customId === 'ss_push') {
        await interaction.update({ components: [] });

        try {
          const fresh = await getFile(SLIDESHOW_PATH);
          const pushSha = fresh ? fresh.sha : sha;
          await putFile(SLIDESHOW_PATH, JSON.stringify(slides, null, 2), 'Update slideshow content', pushSha);
        } catch (err) {
          return interaction.followUp({ embeds: [errorEmbed('Push Failed', `\`${err.message}\``)], ephemeral: true });
        }

        sessions.delete(uid);
        return interaction.editReply({
          embeds: [successEmbed('Slideshow Modified', 'Slideshow modified successfully.')],
          components: [],
        });
      }
    }

    // ── Modals ───────────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const session = sessions.get(uid);
      if (!session) {
        return interaction.reply({ embeds: [errorEmbed('Session Expired', 'Please run `/edit-slideshow` again.')], ephemeral: true });
      }

      const { slides, page } = session;

      if (interaction.customId === 'ss_edit_modal') {
        const slide = slides[page];
        const val = (id) => interaction.fields.getTextInputValue(id).trim();

        // Only overwrite if the user actually typed something
        if (val('header'))      slide.header      = val('header');
        if (val('description')) slide.description = val('description');
        if (val('href'))        slide.href        = val('href');
        if (val('img'))         slide.img         = val('img');
        if (val('alt'))         slide.alt         = val('alt');

        return interaction.update({
          embeds: [buildSlideEmbed(slide, page, slides.length)],
          components: buildButtonRows(page, slides.length, slide.active),
        });
      }

      if (interaction.customId === 'ss_delete_modal') {
        const confirm = interaction.fields.getTextInputValue('confirm').trim();

        if (confirm !== 'YES') {
          return interaction.reply({ embeds: [warnEmbed('Cancelled', 'Deletion cancelled. You must type exactly `YES` to confirm.')], ephemeral: true });
        }

        const removed = slides.splice(page, 1)[0];
        const newPage = Math.min(page, slides.length - 1);
        session.page = newPage;

        if (slides.length === 0) {
          return interaction.update({
            embeds: [warnEmbed('Slideshow Empty', `Deleted slide **${removed.header}**. No slides remain. Press Save & Push to commit.`)],
            components: [],
          });
        }

        return interaction.update({
          embeds: [buildSlideEmbed(slides[newPage], newPage, slides.length)],
          components: buildButtonRows(newPage, slides.length, slides[newPage].active),
        });
      }
    }
  },
};
