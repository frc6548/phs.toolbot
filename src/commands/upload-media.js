const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { putFile, getFile } = require('../utils/github');
const sharp = require('sharp');

const TYPE_PATHS = {
  gallery:  'data/gallery',
  slide:    'data/slideshow',
  sponsors: 'data/sponsors',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('upload-media')
    .setDescription('Upload an image to the PHS Rambots website. Automatically converted to WebP.')
    .addStringOption(o =>
      o.setName('type')
        .setDescription('Where to upload the image')
        .setRequired(true)
        .addChoices(
          { name: 'Gallery  → /data/gallery',   value: 'gallery'  },
          { name: 'Slideshow → /data/slideshow', value: 'slide'    },
          { name: 'Sponsors → /data/sponsors',  value: 'sponsors' },
        )
    )
    .addAttachmentOption(o =>
      o.setName('image')
        .setDescription('Image to upload (PNG, JPG, GIF, WEBP, etc.)')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('filename')
        .setDescription('Output filename without extension (e.g. "robot2026"). Defaults to original name.')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const type       = interaction.options.getString('type');
    const attachment = interaction.options.getAttachment('image');
    const customName = interaction.options.getString('filename');

    // Validate it's an image
    if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
      return interaction.editReply({ embeds: [errorEmbed('Invalid File', 'The attached file must be an image (PNG, JPG, WEBP, GIF, etc.)')] });
    }

    // Determine output filename
    const baseName = (customName || attachment.name.replace(/\.[^.]+$/, ''))
      .replace(/[^a-zA-Z0-9\-_]/g, '-') // sanitize
      .toLowerCase();
    const outputFilename = `${baseName}.webp`;
    const repoPath = `${TYPE_PATHS[type]}/${outputFilename}`;

    // Download the image from Discord's CDN
    let imageBuffer;
    try {
      const res = await fetch(attachment.url);
      if (!res.ok) throw new Error(`Failed to download attachment: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed('Download Failed', `Could not download the attachment:\n\`${err.message}\``)] });
    }

    // Convert to WebP using sharp
    let webpBuffer;
    try {
      webpBuffer = await sharp(imageBuffer)
        .webp({ quality: 85 })
        .toBuffer();
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed('Conversion Failed', `Could not convert image to WebP:\n\`${err.message}\``)] });
    }

    // Check if file already exists (need sha to overwrite)
    let existingSha = null;
    try {
      const existing = await getFile(repoPath);
      if (existing) existingSha = existing.sha;
    } catch (_) {
      // File doesn't exist, that's fine
    }

    // Push to GitHub
    try {
      await putFile(
        repoPath,
        webpBuffer.toString('base64'), // putFile does base64 encode — pass raw base64 directly
        `Upload media "${outputFilename}" to ${TYPE_PATHS[type]}`,
        existingSha,
        true // binary flag
      );
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed('GitHub Push Failed', `\`${err.message}\``)] });
    }

    const websitePath = `/${repoPath}`;
    const siteUrl     = `https://phsrambots.org${websitePath}`;

    const embed = successEmbed('Media Uploaded', `**${outputFilename}** has been pushed to the repository.`)
      .addFields(
        { name: '📁 Type',         value: type,                        inline: true  },
        { name: '📄 Filename',     value: outputFilename,              inline: true  },
        { name: '🔗 Site Path',    value: `\`${websitePath}\``,        inline: false },
        { name: '🌐 URL',          value: siteUrl,                     inline: false },
        { name: '📦 Original',     value: `${attachment.name} (${(attachment.size / 1024).toFixed(1)} KB)`, inline: true },
        { name: '✅ Converted',    value: `${(webpBuffer.length / 1024).toFixed(1)} KB WebP`, inline: true },
        { name: existingSha ? '♻️ Action' : '🆕 Action', value: existingSha ? 'Overwrote existing file' : 'Created new file', inline: true },
      )
      .setThumbnail(attachment.url); // show original as thumbnail in the response embed

    await interaction.editReply({ embeds: [embed] });
  },
};
