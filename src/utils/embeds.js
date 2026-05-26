const { EmbedBuilder } = require('discord.js');

const RED = 0xE8232A; // Bright-ish red

function baseEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(RED)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: 'phstoolbot • PHS Rambots' })
    .setTimestamp();
}

function successEmbed(title, description) {
  return baseEmbed(`✅  ${title}`, description);
}

function errorEmbed(title, description) {
  return baseEmbed(`❌  ${title}`, description);
}

function infoEmbed(title, description) {
  return baseEmbed(`ℹ️  ${title}`, description);
}

function warnEmbed(title, description) {
  return baseEmbed(`⚠️  ${title}`, description);
}

module.exports = { baseEmbed, successEmbed, errorEmbed, infoEmbed, warnEmbed, RED };
