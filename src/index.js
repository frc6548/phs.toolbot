const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./utils/config');

// MUST run first — populates process.env from .env file
config.checkConfig();

// Read values only after checkConfig has run
const BOT_TOKEN = config.BOT_TOKEN;
const CLIENT_ID = config.CLIENT_ID;
const GUILD_ID  = config.GUILD_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

const commandsData = [];
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
  commandsData.push(command.data.toJSON());
}

// Register slash commands
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commandsData });
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
})();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    // Auth check: only allow users from the configured guild
    if (!interaction.member || interaction.guildId !== GUILD_ID) {
      const { errorEmbed } = require('./utils/embeds');
      return interaction.reply({ embeds: [errorEmbed('Permission Denied', 'You do not have permission to use this bot.')], ephemeral: true });
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      const { errorEmbed } = require('./utils/embeds');
      const payload = { embeds: [errorEmbed('Error', 'Something went wrong executing that command.')], ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    }
  }

  // Handle button/modal interactions (delegated to commands)
  if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
    const slideshowHandler = require('./commands/edit-slideshow');
    if (typeof slideshowHandler.handleInteraction === 'function') {
      try {
        await slideshowHandler.handleInteraction(interaction);
      } catch (err) {
        console.error(err);
      }
    }
  }
});

client.login(BOT_TOKEN);