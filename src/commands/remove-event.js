const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { getFile, putFile } = require('../utils/github');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-event')
    .setDescription('Remove an event from the PHS Rambots calendar by its ID tag.')
    .addStringOption(o => o.setName('id').setDescription('Event ID tag (e.g. Craft-Show-At-Village-Fresh-2026-10-10)').setRequired(true))
    .addIntegerOption(o => o.setName('year').setDescription('Year of the event').setRequired(true))
    .addIntegerOption(o => o.setName('month').setDescription('Month of the event (1–12)').setRequired(true).setMinValue(1).setMaxValue(12)),

  async execute(interaction) {
    await interaction.deferReply();

    const id    = interaction.options.getString('id');
    const year  = interaction.options.getInteger('year');
    const month = interaction.options.getInteger('month');

    const filePath = `data/calendar/${year}/${month}/events.json`;

    let events = [];
    let sha = null;

    try {
      const existing = await getFile(filePath);
      if (!existing) {
        return interaction.editReply({ embeds: [errorEmbed('File Not Found', `No events file found at \`${filePath}\`.`)] });
      }
      events = JSON.parse(existing.content);
      sha = existing.sha;
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed('GitHub Error', `Failed to read calendar file:\n\`${err.message}\``)] });
    }

    const target = events.find(e => e.id === id);
    if (!target) {
      return interaction.editReply({ embeds: [errorEmbed('Event Not Found', `No event with ID \`${id}\` found in \`${filePath}\`.`)] });
    }

    const updated = events.filter(e => e.id !== id);

    try {
      await putFile(filePath, JSON.stringify(updated, null, 2), `Remove event "${target.title}" (${id})`, sha);
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed('GitHub Error', `Failed to push changes:\n\`${err.message}\``)] });
    }

    const embed = successEmbed('Event Removed', `**${target.title}** has been removed from the calendar.`)
      .addFields(
        { name: '🔖 ID',     value: `\`${id}\``,        inline: true },
        { name: '📅 Date',   value: target.date,         inline: true },
        { name: '📁 File',   value: `\`${filePath}\``,   inline: false },
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
