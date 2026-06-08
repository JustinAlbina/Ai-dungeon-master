# AI Dungeon Master

**A fully AI-run D&D experience for complete beginners — multiplayer, voiced, and playable from a single shared link.**

No accounts, no setup, no D&D knowledge required for players. The host creates a session, shares a 5-character code, and the AI handles everything from there.

🎲 Live on Vercel

---

## Overview

AI Dungeon Master is a full multiplayer web application that runs a complete D&D campaign through Claude's API. Players join via a session code, build a character with an AI-generated portrait, and play together in real time — synced through Supabase. The DM is voiced through OpenAI TTS, narrates the story, manages combat, rolls dice when needed, tracks every character's stats, and generates scene images as the party moves through the world.

It was built to solve one problem: finding a DM is hard. The AI is always available.

---

## Stack

| Layer | Tech |
|---|---|
| AI — DM brain | Anthropic Claude API (`claude-opus-4-5`) |
| AI — Voice | OpenAI TTS API (`tts-1`, Fable voice) |
| AI — Scene images | OpenAI Image API (`gpt-image-1`) |
| AI — Character portraits | OpenAI Image API (`gpt-image-1`) |
| Multiplayer sync | Supabase (Postgres + Realtime subscriptions) |
| Frontend | React 18 |
| Backend | Vercel serverless functions (Node.js) |
| Deploy | Vercel |

---

## Features

### Multiplayer Sessions
- Host creates a session and configures the campaign: setting (High Fantasy, Dark Fantasy, Pirates & Seas, Sci-Fi D&D, Horror) and DM personality (Epic & Dramatic, Funny & Casual, Gritty & Serious, Mysterious & Eerie)
- Players join with a 5-character code — no account needed
- All messages, character sheets, quest state, and scene images sync in real time via Supabase Realtime
- Host controls pacing; non-host players watch and can replay voice

### Character Creation
- Guided 4-step flow: Race → Class → Identity & Appearance → Backstory
- 10 races, 12 classes (Fighter, Wizard, Rogue, Cleric, Ranger, Paladin, Bard, Druid, Barbarian, Monk, Sorcerer, Warlock)
- Class-specific stat arrays, HP, AC, abilities, spells, and starting inventory pre-populated
- AI-generated character portrait via OpenAI Image API based on race, class, and appearance description
- Full character sheet with stats, abilities, spells, gear slots, backpack, and auto-saved adventure notes

### AI Dungeon Master
- Custom system prompt encodes full D&D 5e rules, campaign setting, DM personality, and all player backstories
- DM teaches rules naturally as they come up — no upfront rules dumps
- Manages combat, NPC dialogue, skill checks, exploration, and narrative continuity
- Tracks HP, AC, inventory, and spell slots for every character via structured `<SHEET_UPDATE>` tags parsed from responses
- Manages quest log via `<QUEST_UPDATE>` tags
- Manages combat initiative order via `<INITIATIVE>` and `<TURN>` tags

### Dice Rolling System
- When a roll is required, the DM responds with a `<ROLL_REQUEST>` tag specifying die, skill, ability, and flavor text
- An animated dice roller appears for the player, locked to the correct die and modifier
- Result is automatically sent back to the DM as `[ROLL_RESULT: X]` after a 2-second display
- Critical hits (natural 20) and critical fails (natural 1) handled with special feedback
- Free roll button available for casual rolls outside of DM requests

### Voice Narration
- DM responses are cleaned of markdown and tags, chunked at sentence boundaries (~700 chars), and streamed to OpenAI TTS
- Chunks are prefetched two ahead to minimize silence between sentences
- Falls back to browser SpeechSynthesis if TTS API fails
- Voice toggle, stop button, and replay last DM message available at all times
- Speech recognition via Web Speech API for voice input (Chrome)

### Scene Images
- Opening scene image generates immediately on campaign start using a quick setting-appropriate prompt — doesn't block TTS or DM response
- DM's `<SCENE_IMAGE>` tag description generates a higher-quality replacement image in the background
- New images only generate on major location changes (new building, new region) — not within the same location
- Images are expandable in a lightbox

### Dungeon Map
- Interactive 12×12 grid dungeon map with draggable player tokens
- Terrain types: wall, floor, door, water, trap, treasure, stairs
- Edit mode lets the DM paint terrain by clicking/dragging
- Tokens show character portrait if available, class symbol otherwise
- Player legend with HP tracking

---

## Architecture Notes

**Structured tag parsing** — The DM's responses contain embedded XML-style tags (`<SHEET_UPDATE>`, `<QUEST_UPDATE>`, `<INITIATIVE>`, `<TURN>`, `<SCENE_IMAGE>`, `<ROLL_REQUEST>`) that drive all game state updates. Tags are stripped before rendering or sending to TTS. This keeps Claude's output as the single source of truth for game state without a separate game engine.

**Non-blocking image generation** — Scene images generate in the background after TTS starts playing. The player hears the narration immediately while the image loads separately, rather than waiting for both.

**Audio chunk prefetching** — TTS chunks are fetched two ahead of playback. While chunk N is playing, chunks N+1 and N+2 are already downloading. This eliminates the gap between sentences that would otherwise make the narration feel choppy.

**Supabase Realtime sync** — All session state (messages, character sheets, quests, scene image, initiative, current turn) persists in a single Postgres row and syncs to all connected clients via a Realtime subscription on `UPDATE` events.

---

## What I Learned Building This

I built the original version of this app as a single-player experience — Claude as a DM, voice narration, basic chat. Then I rebuilt it almost entirely to add multiplayer, real-time sync, structured game state, and AI-generated visuals. Most of what's in this version I had to figure out from scratch.

**Supabase Realtime** — I'd never worked with WebSocket-based data sync before. Getting all clients to stay in sync without conflicts or stale state required learning how Realtime subscriptions work, how to structure a Postgres row that all clients could update without overwriting each other, and how to reconcile local state with incoming updates cleanly.

**Structured output from an LLM** — The original version of this app just rendered whatever Claude said as text. The current version parses structured tags out of Claude's responses to drive character sheet updates, quest tracking, dice roll requests, combat initiative, and scene image generation. Learning how to design a prompt that reliably produces parseable structured output — and how to make the app degrade gracefully when it doesn't — was the most interesting engineering challenge in this project.

**Audio streaming and prefetching** — The first version of TTS played each chunk sequentially: fetch chunk 1, play it, then fetch chunk 2. There was a noticeable gap between sentences. Implementing lookahead prefetching — kicking off the next two fetches while the current chunk plays — eliminated the gaps and made the narration feel continuous. Simple idea, but it required rethinking how the audio queue was managed.

**Non-blocking UI with parallel async work** — The app has several things that need to happen at once: TTS starts immediately, game state parses in parallel, and images generate in the background without blocking anything. Learning when to `await` and when to fire-and-forget, and how to update React state from background async operations without race conditions, took real iteration.

**Prompt engineering for a stateful game** — Keeping the DM in character, remembering all player backstories, tracking HP and inventory across a long session, and reliably emitting structured tags at the right times required careful prompt design. Early versions forgot character names mid-session or emitted malformed tags. The current system prompt is the result of a lot of play-testing.

**Character portrait generation** — Feeding a player's described appearance, race, and class into the image API and getting something that actually looks like a D&D character portrait required significant prompt tuning. The final approach uses a structured prompt that specifies art style, lighting, pose, and costume details derived from the class.

The honest version: the first commit of this project and the current version barely share any code. Most of what's here came from building, breaking, and rebuilding.

---

## Local Development

```bash
git clone https://github.com/JustinAlbina/Ai-dungeon-master
cd Ai-dungeon-master
npm install
```

Create a `.env` file:

```
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
```

```bash
npm start
```

Supabase setup: create a `sessions` table with columns for `code`, `messages`, `characters`, `quests`, `scene_image`, `setting`, `personality`, `player_count`, `players`, `initiative`, `current_turn`, `started`, and `created_at`. Enable Realtime on the table.

---

Built by Justin Albina
