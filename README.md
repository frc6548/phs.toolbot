# phstoolbot

PHS Rambots Discord management bot with slash commands for managing website content via GitHub.

---

## Setup Instructions

### 1. Prerequisites

- **Node.js 18+** — https://nodejs.org
- A **Discord account** with a server where you have admin rights
- A **GitHub Personal Access Token** with `repo` write access

---

### 2. Create the Discord Application & Bot

1. Go to https://discord.com/developers/applications
2. Click **New Application** → name it `phstoolbot`
3. Go to the **Bot** tab → click **Add Bot**
4. Under **Token**, click **Reset Token** and copy it — this is your `BOT_TOKEN`
5. Copy the **Application ID** from the General Information tab — this is your `CLIENT_ID`
6. Under **Bot → Privileged Gateway Intents**, enable:
   - ✅ Server Members Intent (needed for guild verification)
7. Under **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Use Slash Commands`, `Embed Links`
   - Copy the generated URL and open it to invite the bot to your server

---

### 3. Create a GitHub Personal Access Token (PAT)

1. Go to https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Set a name like `phstoolbot`
4. Expiration: your choice (no expiration recommended for bots)
5. Select scope: ✅ `repo` (full control of private repositories)
6. Click **Generate token** — copy it, this is your `GITHUB_PAT`

---

### 4. Install & Configure the Bot

```bash
# Clone or copy the phstoolbot folder to your server/machine
cd phstoolbot

# Install dependencies
npm install

# Copy the example env file
cp .env.example .env

# Edit .env with your values
nano .env   # or use any text editor
```

Fill in your `.env`:

```env
BOT_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_application_client_id_here
GUILD_ID=1424064165928239134
GITHUB_PAT=your_github_pat_here
GITHUB_OWNER=frc6548
GITHUB_REPO=phsrambots.org
```

> **Note:** If `.env` is missing or has blank values, the bot will print a warning on startup, write a template `.env`, and exit. Fill in the file and restart.

---

### 5. Start the Bot

```bash
npm start
```

On first boot, you'll see:
```
✅  Config loaded from .env
Registering slash commands...
Slash commands registered.
Logged in as phstoolbot#XXXX
```

Slash commands register to the guild instantly (no wait).

---

### 6. Running as a Service (optional, Linux)

Create `/etc/systemd/system/phstoolbot.service`:

```ini
[Unit]
Description=phstoolbot Discord Bot
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/phstoolbot
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable phstoolbot
sudo systemctl start phstoolbot
sudo systemctl status phstoolbot
```

---

## Commands

| Command | Description |
|---|---|
| `/add-event` | Add an event to the website calendar |
| `/remove-event` | Remove an event from the calendar by ID |
| `/edit-slideshow` | Interactive slideshow editor with Prev/Next/Edit/Delete/Push buttons |

### `/add-event`
Options: `title`, `date` (YYYY-MM-DD), `start` (HH:MM), `end` (HH:MM), `location`, `description`

Pushes to `data/calendar/[YEAR]/[MONTH]/events.json` on GitHub.  
Event ID is auto-generated from the title and date.

### `/remove-event`
Options: `id` (the event tag), `year`, `month`

Finds and removes the event with the given ID from the correct file.

### `/edit-slideshow`
Pulls up an interactive embed showing each slide with:
- **◀ Prev / Next ▶** — navigate slides
- **✏️ Edit** — opens a modal to edit header, description, link, image path, and alt text
- **🗑 Delete** — prompts you to type `YES` to confirm deletion
- **✔ Save & Push** — commits and pushes all changes to GitHub

---

## Authentication

Only users **inside guild `1424064165928239134`** can run commands. Anyone outside sees:

> ❌ Permission Denied — You do not have permission to use this bot.

---

## GitHub Commit Format

All commits made by the bot are prefixed with `[AUTOMATED]`, e.g.:

```
[AUTOMATED] Add event "Craft Show At Village Fresh" on 2026-10-10
[AUTOMATED] Remove event "Craft Show At Village Fresh" (Craft-Show-At-Village-Fresh-2026-10-10)
[AUTOMATED] Update slideshow content
```
