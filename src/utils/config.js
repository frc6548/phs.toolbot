const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_PATH = path.join(__dirname, '../../.env');

const REQUIRED_KEYS = [
  { key: 'BOT_TOKEN',   description: 'Discord Bot Token (from Discord Developer Portal)' },
  { key: 'CLIENT_ID',   description: 'Discord Application/Client ID' },
  { key: 'GUILD_ID',    description: 'Allowed Guild ID (default: 1424064165928239134)' },
  { key: 'GITHUB_PAT',  description: 'GitHub Personal Access Token (with repo write access)' },
  { key: 'GITHUB_OWNER',description: 'GitHub repo owner (e.g. frc6548)' },
  { key: 'GITHUB_REPO', description: 'GitHub repo name (e.g. phsrambots.org)' },
];

function parseEnv(raw) {
  const result = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    result[k] = v;
  }
  return result;
}

function writeEnv(obj) {
  const lines = REQUIRED_KEYS.map(({ key, description }) => `# ${description}\n${key}=${obj[key] || ''}`);
  fs.writeFileSync(ENV_PATH, lines.join('\n\n') + '\n', 'utf8');
}

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  return parseEnv(fs.readFileSync(ENV_PATH, 'utf8'));
}

function checkConfig() {
  let env = loadEnv();
  const missing = REQUIRED_KEYS.filter(({ key }) => !env[key] || env[key].trim() === '');

  if (missing.length > 0) {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║           phstoolbot — First Boot / Config Setup          ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    if (!fs.existsSync(ENV_PATH)) {
      console.warn('⚠  No .env file found. Creating one now...\n');
    } else {
      console.warn('⚠  Your .env file is missing the following required values:\n');
      missing.forEach(({ key, description }) => console.warn(`   • ${key}  — ${description}`));
    }

    // Write a template .env with blanks for missing keys
    const merged = { ...env };
    for (const { key } of missing) {
      if (!merged[key]) merged[key] = '';
    }
    writeEnv(merged);

    console.log('\n📝  A .env template has been written to:', ENV_PATH);
    console.log('    Fill in the missing values and restart the bot.\n');
    console.log('Required fields:');
    REQUIRED_KEYS.forEach(({ key, description }) => console.log(`  ${key.padEnd(16)} — ${description}`));
    console.log('\nExiting. Please configure .env and restart.\n');
    process.exit(1);
  }

  // Load into process.env
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v;
  }

  console.log('✅  Config loaded from .env');
}

// Exports for use in other modules (loaded after checkConfig runs)
function get(key) {
  return process.env[key];
}

module.exports = {
  checkConfig,
  get BOT_TOKEN()    { return process.env.BOT_TOKEN; },
  get CLIENT_ID()    { return process.env.CLIENT_ID; },
  get GUILD_ID()     { return process.env.GUILD_ID; },
  get GITHUB_PAT()   { return process.env.GITHUB_PAT; },
  get GITHUB_OWNER() { return process.env.GITHUB_OWNER; },
  get GITHUB_REPO()  { return process.env.GITHUB_REPO; },
};
