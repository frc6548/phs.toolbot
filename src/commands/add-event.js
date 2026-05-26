const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { getFile, putFile } = require('../utils/github');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-event')
    .setDescription('Add an event to the PHS Rambots website calendar.')
    .addStringOption(o => o.setName('title').setDescription('Event title').setRequired(true))
    .addStringOption(o => o.setName('date').setDescription('Event date (YYYY-MM-DD)').setRequired(true))
    .addStringOption(o => o.setName('start').setDescription('Start time (HH:MM, 24h)').setRequired(true))
    .addStringOption(o => o.setName('end').setDescription('End time (HH:MM, 24h)').setRequired(true))
    .addStringOption(o => o.setName('location').setDescription('Location of the event').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Event description').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    const title       = interaction.options.getString('title');
    const date        = interaction.options.getString('date');
    const start       = interaction.options.getString('start');
    const end         = interaction.options.getString('end');
    const location    = interaction.options.getString('location');
    const description = interaction.options.getString('description');

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return interaction.editReply({ embeds: [errorEmbed('Invalid Date', 'Date must be in `YYYY-MM-DD` format.')] });
    }

    const [year, month] = date.split('-');
    const filePath = `data/calendar/${year}/${parseInt(month)}/events.json`;

    // Generate ID from title + date
    const id = title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '') + '-' + date;

    const newEvent = { id, title, date, start, end, location, description };

    let events = [];
    let sha = null;

    try {
      const existing = await getFile(filePath);
      if (existing) {
        events = JSON.parse(existing.content);
        sha = existing.sha;
      }
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed('GitHub Error', `Failed to read calendar file:\n\`${err.message}\``)] });
    }

    // Check for duplicate ID
    if (events.find(e => e.id === id)) {
      return interaction.editReply({ embeds: [errorEmbed('Duplicate Event', `An event with ID \`${id}\` already exists.`)] });
    }

    events.push(newEvent);

    try {
      await putFile(filePath, JSON.stringify(events, null, 2), `Add event "${title}" on ${date}`, sha);
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed('GitHub Error', `Failed to push event:\n\`${err.message}\``)] });
    }

    const embed = successEmbed('Event Added', `**${title}** has been added to the calendar.`)
      .addFields(
        { name: '📅 Date',        value: date,        inline: true },
        { name: '🕐 Time',        value: `${start} – ${end}`, inline: true },
        { name: '📍 Location',    value: location,    inline: false },
        { name: '📝 Description', value: description, inline: false },
        { name: '🔖 ID',          value: `\`${id}\``,  inline: false },
        { name: '📁 File',        value: `\`${filePath}\``, inline: false },
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
