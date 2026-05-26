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

// In-memory session store: userId -> { slides, sha, page }
const sessions = new Map();

// ── Command ──────────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responds with Pong!'),

  async execute(interaction) {
    const embed = successEmbed('Pong!', `The bot is running and can communicate with GitHub successfully.`);

    await interaction.reply({ embeds: [embed] });
  }
};
