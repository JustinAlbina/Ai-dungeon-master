# ⚔️ AI Dungeon Master

A fully AI-run D&D Dungeon Master with realistic ElevenLabs voice. Your friends just open the link — no API keys, no setup, no accounts needed on their end.

---

## 🚀 Deploy to Vercel — Step by Step

### Step 1 — Get your API keys (you only do this once)

**Anthropic (for the AI brain):**
1. Go to **console.anthropic.com** and sign up
2. Click "API Keys" → "Create Key"
3. Copy the key (starts with `sk-ant-...`)
4. New accounts get $5 free credit — enough for many sessions

**ElevenLabs (for the realistic voice):**
1. Go to **elevenlabs.io** and sign up free
2. Click your profile picture → "API Keys" → copy it
3. Free tier = 10,000 characters/month (~30 min of DM narration)

---

### Step 2 — Put the code on GitHub

1. Go to **github.com** → sign up or log in
2. Click **+** (top right) → "New repository"
3. Name it `dnd-dungeon-master`, set to **Public**, click "Create repository"
4. On the next page click **"uploading an existing file"**
5. Drag in ALL the files from this zip (keeping the folder structure):
   ```
   api/
     claude.js
     tts.js
   public/
     index.html
   src/
     App.js
     DungeonMaster.js
     index.js
   package.json
   vercel.json
   README.md
   ```
6. Click "Commit changes"

---

### Step 3 — Deploy on Vercel

1. Go to **vercel.com** → "Sign Up" with your GitHub account (free)
2. Click **"Add New Project"**
3. Find and click **Import** next to `dnd-dungeon-master`
4. **Before clicking Deploy**, click **"Environment Variables"** and add:

   | Name | Value |
   |------|-------|
   | `ANTHROPIC_API_KEY` | your `sk-ant-...` key |
   | `ELEVENLABS_API_KEY` | your ElevenLabs key |

5. Click **Deploy**
6. Wait ~1 minute...
7. 🎉 You get a URL like `https://dnd-dungeon-master-abc.vercel.app`

**Share that link with your friends. They just open it and play — no setup!**

---

## 🎭 Changing the DM Voice

The default voice is **Daniel** (deep British narrator). To change it:

1. Go to **elevenlabs.io/voice-library**
2. Browse and find a voice you like
3. Click it — copy the Voice ID from the URL (looks like `onwK4e9ZLuTAKqWW03F9`)
4. Open `api/tts.js` and change the default voiceId value
5. Commit the change — Vercel auto-redeploys in ~30 seconds

**Great DM voices:**
| Voice | Description | ID |
|-------|-------------|-----|
| Daniel | Deep, British, dramatic | `onwK4e9ZLuTAKqWW03F9` |
| Clyde | American, warm, storyteller | `2EiwWnXFnvU5JabPnv8n` |
| Arnold | Powerful, commanding | `VR6AewLTigWG4xSOukaG` |
| Thomas | Calm, wise, measured | `GBv7mTt0atIp3Br8iCZE` |

---

## 🎮 How to Play

1. Share the Vercel link with your group
2. **Everyone can play from their own device** — or gather around one screen
3. The DM will welcome you and walk through everything
4. You don't need to know ANY D&D rules — the AI teaches as you go!

**Tips:**
- Start by telling the DM how many players there are and your names
- Say things like *"I try to pick the lock"* or *"I cast a spell at the goblin"*
- Use the quick-action buttons at the bottom
- If voice stops, hit 🔁 Replay

---

## 💰 Cost Estimate

For a typical 2-hour session:
- **Claude API**: ~$0.10–0.30 (very cheap)
- **ElevenLabs**: ~1,500–3,000 characters (well within free tier)

Basically free for casual use.
