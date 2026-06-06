import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import DiceRoller from "./DiceRoller";
import CharacterSheet from "./CharacterSheet";

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(setting, personality) {
  const settingDesc = {
    "High Fantasy": "classic heroic fantasy world with kingdoms, dragons, elves, and epic quests",
    "Dark Fantasy": "grim, morally grey world of corruption, monsters, and hard choices",
    "Pirates & Seas": "swashbuckling world of ocean adventures, sea monsters, and pirate treasure",
    "Sci-Fi D&D": "futuristic world blending magic and technology, space travel and ancient ruins",
    "Horror": "terrifying world of dread, eldritch horrors, and survival against darkness",
  }[setting] || "classic fantasy world";

  const personalityDesc = {
    "Epic & Dramatic": "You speak dramatically with gravitas. Every moment feels legendary.",
    "Funny & Casual": "You're witty and fun, cracking jokes while still telling a great story.",
    "Gritty & Serious": "You're serious and immersive. The world feels real and consequential.",
    "Mysterious & Eerie": "You speak in evocative, mysterious tones. Everything feels slightly unsettling.",
  }[personality] || "You are dramatic and engaging.";

  return `You are an expert Dungeons & Dragons Dungeon Master running a ${settingDesc} campaign for complete beginners. ${personalityDesc}

CORE DUTIES:
1. TEACH as you play — explain rules naturally when they come up
2. RUN everything — combat, roleplay, exploration, NPCs, dice rolls
3. CREATE an evolving story based on player choices
4. TRACK character HP, stats, spells, inventory precisely
5. BE FORGIVING — this is their first time

CHARACTER SETUP (do this first):
- Welcome everyone warmly, explain D&D in 2-3 sentences
- Ask how many players and their names
- Help each pick a class with brief fun descriptions (no tables, use plain text)
- Assign stats automatically — don't make beginners figure out stat generation
- Give starting equipment
- Then launch into an exciting opening scene for the ${setting} setting

DURING PLAY:
- For dice rolls, say exactly: "Roll a d20! (or I'll roll for you)" then report: [Rolled 14 + 3 STR = 17 — SUCCESS!]
- After EVERY combat action state all HP values
- Use character names constantly
- Every 3-4 exchanges give a meaningful choice

CHARACTER SHEET UPDATES:
When character info changes, output a JSON block at the END of your response like this:
<SHEET_UPDATE>
{
  "playerName": "Justin",
  "character": {
    "name": "Theron",
    "cls": "Paladin",
    "race": "Human",
    "level": 1,
    "hp": 12,
    "maxHp": 12,
    "ac": 18,
    "stats": { "STR": 16, "DEX": 10, "CON": 14, "INT": 10, "WIS": 12, "CHA": 14 },
    "abilities": [{ "name": "Divine Sense", "desc": "Detect celestial/fiend/undead within 60ft. 4/day" }],
    "inventory": ["Longsword", "Shield", "Chain Mail", "Holy Symbol", "5 GP"],
    "spells": []
  }
}
</SHEET_UPDATE>

SCENE IMAGES:
When the scene changes significantly (new location, major event, combat starts), output:
<SCENE_IMAGE>a detailed visual description of the scene for image generation, 1-2 sentences</SCENE_IMAGE>

QUEST UPDATES:
When quests are discovered or completed:
<QUEST_UPDATE>
[{ "id": "1", "title": "Quest name", "desc": "Brief description", "status": "active" }]
</QUEST_UPDATE>

FORMATTING:
- **bold** for important terms and names
- *italics* for atmosphere and NPC speech
- # for major section headers
- Do NOT use markdown tables or pipe characters
- Keep responses vivid but conversational

Begin by warmly welcoming the players!`;
}

function fmt(text) {
  const stripped = text.replace(/<SHEET_UPDATE>[\s\S]*?<\/SHEET_UPDATE>/g, "")
    .replace(/<SCENE_IMAGE>[\s\S]*?<\/SCENE_IMAGE>/g, "")
    .replace(/<QUEST_UPDATE>[\s\S]*?<\/QUEST_UPDATE>/g, "");
  return stripped
    .replace(/^# (.+)$/gm, "<h2 style='font-family:Cinzel,serif;color:#f4c842;font-size:18px;letter-spacing:2px;margin:14px 0 8px'>$1</h2>")
    .replace(/^## (.+)$/gm, "<h3 style='font-family:Cinzel,serif;color:#d4aa3c;font-size:15px;letter-spacing:1px;margin:12px 0 6px'>$1</h3>")
    .replace(/^---+$/gm, "<hr style='border:none;border-top:1px solid rgba(200,148,58,.2);margin:10px 0'/>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

function cleanForSpeech(text) {
  return text
    .replace(/<SHEET_UPDATE>[\s\S]*?<\/SHEET_UPDATE>/g, "")
    .replace(/<SCENE_IMAGE>[\s\S]*?<\/SCENE_IMAGE>/g, "")
    .replace(/<QUEST_UPDATE>[\s\S]*?<\/QUEST_UPDATE>/g, "")
    .replace(/^#{1,3} /gm, "").replace(/^---+$/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
    .replace(/[🎲📜⚔️🏰🐉⚡🎭🔮🗡️🏹🛡️🌿💀]/gu, "")
    .replace(/\[.*?\]/g, "").replace(/\|/g, " ")
    .replace(/\s+/g, " ").trim();
}

function parseSheetUpdates(text) {
  const updates = {};
  const regex = /<SHEET_UPDATE>([\s\S]*?)<\/SHEET_UPDATE>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      if (data.playerName && data.character) updates[data.playerName] = data.character;
    } catch (e) { /* ignore parse errors */ }
  }
  return updates;
}

function parseSceneImage(text) {
  const match = text.match(/<SCENE_IMAGE>([\s\S]*?)<\/SCENE_IMAGE>/);
  return match ? match[1].trim() : null;
}

function parseQuestUpdate(text) {
  const match = text.match(/<QUEST_UPDATE>([\s\S]*?)<\/QUEST_UPDATE>/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
}

function chunkText(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > 500 && current.length > 0) {
      chunks.push(current.trim()); current = s;
    } else { current += s; }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

const QUICK = ["What are my options?", "What's my HP?", "I look around carefully", "I talk to the NPC", "I attack!", "Explain that rule please", "Recap the story so far"];

// ── Main Component ────────────────────────────────────────────────────────────

export default function Game({ session, onLeave }) {
  const { sessionId, playerName, isHost, setting, personality } = session;

  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [speaking, setSpeaking]         = useState(false);
  const [listening, setListening]       = useState(false);
  const [voiceOn, setVoiceOn]           = useState(true);
  const [showDice, setShowDice]         = useState(false);
  const [showSheet, setShowSheet]       = useState(false);
  const [showQuests, setShowQuests]     = useState(false);
  const [characters, setCharacters]     = useState({});
  const [quests, setQuests]             = useState([]);
  const [sceneImage, setSceneImage]     = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [initialized, setInitialized]   = useState(false);

  const bottomRef    = useRef(null);
  const audioRef     = useRef(null);
  const stopRef      = useRef(false);
  const synthRef     = useRef(window.speechSynthesis);
  const kaRef        = useRef(null);
  const channelRef   = useRef(null);

  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 3 + 1, dur: Math.random() * 12 + 8, delay: Math.random() * 6,
    }))
  );

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Supabase realtime ────────────────────────────────────────────────────────
  useEffect(() => {
    // Load existing session data
    supabase.from("sessions").select("*").eq("code", sessionId).single().then(({ data }) => {
      if (data) {
        setMessages(data.messages || []);
        setCharacters(data.characters || {});
        setQuests(data.quests || []);
        setSceneImage(data.scene_image || null);
      }
    });

    // Subscribe to realtime changes
    const channel = supabase.channel("session:" + sessionId)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: "code=eq." + sessionId },
        (payload) => {
          const d = payload.new;
          setMessages(d.messages || []);
          setCharacters(d.characters || {});
          setQuests(d.quests || []);
          if (d.scene_image) setSceneImage(d.scene_image);
        })
      .subscribe();
    channelRef.current = channel;

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // Auto-start if host and no messages
  useEffect(() => {
    if (isHost && !initialized) {
      setInitialized(true);
      // Small delay to let supabase load
      setTimeout(() => {
        supabase.from("sessions").select("messages").eq("code", sessionId).single().then(({ data }) => {
          if (!data?.messages?.length) launch();
        });
      }, 1500);
    }
  }, [isHost, initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist to Supabase ─────────────────────────────────────────────────────
  const persist = async (newMessages, newCharacters, newQuests, newImage) => {
    await supabase.from("sessions").update({
      messages: newMessages,
      characters: newCharacters,
      quests: newQuests,
      scene_image: newImage,
    }).eq("code", sessionId);
  };

  // ── OpenAI TTS ──────────────────────────────────────────────────────────────
  const speakChunk = async (chunk) => {
    const res = await fetch("/api/tts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: chunk, voice: "onyx" }),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      if (stopRef.current) { URL.revokeObjectURL(url); resolve(false); return; }
      const audio = new Audio(url);
      audio._url = url;
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); resolve(true); };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
      audio.play().catch(() => resolve(false));
    });
  };

  const speakOpenAI = useCallback(async (text) => {
    const t = cleanForSpeech(text);
    if (!t) return false;
    const chunks = chunkText(t);
    stopRef.current = false;
    setSpeaking(true);
    for (const chunk of chunks) {
      if (stopRef.current) break;
      await speakChunk(chunk);
    }
    setSpeaking(false);
    return true;
  }, []);

  const speakBrowser = useCallback((text) => {
    const t = cleanForSpeech(text); if (!t) return;
    synthRef.current.cancel(); clearInterval(kaRef.current);
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(t);
      u.rate = 0.88; u.pitch = 0.82; u.volume = 1;
      const vs = synthRef.current.getVoices();
      const v = vs.find(v => v.name.includes("UK English Male") || v.name.includes("Daniel"))
              || vs.find(v => v.lang.startsWith("en")) || vs[0];
      if (v) u.voice = v;
      u.onstart = () => { setSpeaking(true); kaRef.current = setInterval(() => { if (synthRef.current.paused) synthRef.current.resume(); }, 10000); };
      u.onend   = () => { setSpeaking(false); clearInterval(kaRef.current); };
      u.onerror = (e) => { if (e.error !== "interrupted") setSpeaking(false); clearInterval(kaRef.current); };
      synthRef.current.speak(u);
    }, 120);
  }, []);

  const stopAudio = useCallback(() => {
    stopRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    synthRef.current.cancel(); clearInterval(kaRef.current);
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text) => {
    if (!voiceOn || !text) return;
    stopAudio();
    const ok = await speakOpenAI(text);
    if (!ok) speakBrowser(text);
  }, [voiceOn, speakOpenAI, speakBrowser, stopAudio]);

  // ── Speech recognition ──────────────────────────────────────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition needs Chrome!"); return; }
    stopAudio();
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
    rec.onstart  = () => setListening(true);
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror  = () => setListening(false);
    rec.onend    = () => setListening(false);
    rec.start();
  };

  // ── Scene image generation ──────────────────────────────────────────────────
  const generateImage = async (prompt) => {
    setImageLoading(true);
    try {
      const res = await fetch("/api/image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (e) { console.error("Image gen error", e); }
    setImageLoading(false);
    return null;
  };

  // ── Claude API ──────────────────────────────────────────────────────────────
  const askClaude = async (history) => {
    const res = await fetch("/api/claude", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1200,
        system: buildSystemPrompt(setting, personality),
        messages: history.map(m => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "Error " + res.status); }
    const data = await res.json();
    return data.content?.[0]?.text || "The DM ponders...";
  };

  // ── Game actions ────────────────────────────────────────────────────────────
  const launch = async () => {
    setLoading(true);
    try {
      const reply = await askClaude([{ role: "user", content: "Begin the session! Welcome us warmly and start campaign setup." }]);
      const msg = { role: "assistant", content: reply, id: Date.now(), player: "DM" };
      const newMsgs = [msg];
      setMessages(newMsgs);

      // Handle sheet/quest/image updates
      const sheetUpdates = parseSheetUpdates(reply);
      const newChars = { ...characters, ...sheetUpdates };
      if (Object.keys(sheetUpdates).length) setCharacters(newChars);

      const questUpdate = parseQuestUpdate(reply);
      const newQuests = questUpdate || quests;
      if (questUpdate) setQuests(newQuests);

      const imagePrompt = parseSceneImage(reply);
      let newImage = sceneImage;
      if (imagePrompt) {
        const url = await generateImage(imagePrompt);
        if (url) { setSceneImage(url); newImage = url; }
        setImageLoading(false);
      }

      await persist(newMsgs, newChars, newQuests, newImage);
      speak(reply);
    } catch (e) {
      const errMsg = { role: "assistant", content: "Error: " + e.message, id: Date.now(), player: "DM" };
      setMessages([errMsg]);
    }
    setLoading(false);
  };

  const send = async (text) => {
    if (!text.trim() || loading || !isHost) return;
    const userMsg = { role: "user", content: text, id: Date.now(), player: playerName };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    stopAudio();

    try {
      const reply = await askClaude(history);
      const dmMsg = { role: "assistant", content: reply, id: Date.now() + 1, player: "DM" };
      const newMsgs = [...history, dmMsg];

      const sheetUpdates = parseSheetUpdates(reply);
      const newChars = { ...characters, ...sheetUpdates };
      if (Object.keys(sheetUpdates).length) setCharacters(newChars);

      const questUpdate = parseQuestUpdate(reply);
      const newQuests = questUpdate ? [...quests, ...questUpdate.filter(q => !quests.find(eq => eq.id === q.id))] : quests;
      if (questUpdate) setQuests(newQuests);

      const imagePrompt = parseSceneImage(reply);
      let newImage = sceneImage;
      if (imagePrompt) {
        const url = await generateImage(imagePrompt);
        if (url) { setSceneImage(url); newImage = url; }
        setImageLoading(false);
      }

      setMessages(newMsgs);
      await persist(newMsgs, newChars, newQuests, newImage);
      speak(reply);
    } catch (e) {
      const errMsg = { role: "assistant", content: "Error: " + e.message, id: Date.now() + 1, player: "DM" };
      setMessages(p => [...p, errMsg]);
    }
    setLoading(false);
  };

  const handleDiceRoll = ({ die, roll, modifier, total, isCrit, isFail }) => {
    setShowDice(false);
    let msg = playerName + " rolled d" + die + ": got " + roll;
    if (modifier !== 0) msg += " " + (modifier >= 0 ? "+" : "") + modifier + " = " + total;
    if (isCrit) msg += " — NATURAL 20! CRITICAL HIT!";
    if (isFail) msg += " — NATURAL 1! CRITICAL FAIL!";
    send(msg);
  };

  const lastDM = [...messages].reverse().find(m => m.role === "assistant");
  const myChar = characters[playerName];
  const activeQuests = quests.filter(q => q.status === "active");

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 0%,#1a0a2e 0%,#0d0d1a 40%,#000508 100%)",
      fontFamily: "'Palatino Linotype','Book Antiqua',Georgia,serif",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden", color: "#e8d5a3",
    }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "fixed", left: p.x + "%", top: p.y + "%",
          width: p.size + "px", height: p.size + "px",
          background: "radial-gradient(circle,#f4c842,#c97b2a)",
          borderRadius: "50%", opacity: .3, pointerEvents: "none", zIndex: 0,
          boxShadow: "0 0 6px #f4c842",
          animation: "fp " + p.dur + "s " + p.delay + "s ease-in-out infinite alternate",
        }} />
      ))}

      <style>{`
        @keyframes fp     { from{transform:translateY(0) scale(1);opacity:.2} to{transform:translateY(-26px) scale(1.2);opacity:.5} }
        @keyframes glow   { 0%,100%{box-shadow:0 0 14px rgba(212,170,60,.28)} 50%{box-shadow:0 0 32px rgba(212,170,60,.65)} }
        @keyframes lpulse { 0%,100%{box-shadow:0 0 0 0 rgba(220,80,80,.6)} 50%{box-shadow:0 0 0 10px rgba(220,80,80,0)} }
        @keyframes shimmer{ 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes breathe{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes imgfade{ from{opacity:0} to{opacity:1} }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#0d0d1a} ::-webkit-scrollbar-thumb{background:#4a3520;border-radius:3px}
        textarea:focus{outline:none;box-shadow:0 0 0 1px rgba(200,148,58,.35)}
        .qb:hover{background:rgba(212,170,60,.18)!important}
        .cb:hover{opacity:.75}
        .toolbtn:hover{background:rgba(212,170,60,.15)!important;border-color:#c8943a!important}
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        position: "relative", zIndex: 10, textAlign: "center",
        padding: "16px 16px 10px",
        borderBottom: "1px solid rgba(212,170,60,.18)",
        background: "rgba(0,0,0,.6)", backdropFilter: "blur(12px)",
      }}>
        <div style={{
          fontFamily: "'Cinzel',serif", fontSize: "clamp(15px,3.5vw,26px)", fontWeight: 700,
          background: "linear-gradient(135deg,#f4c842 0%,#e8a020 40%,#f4c842 80%)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          animation: "shimmer 4s linear infinite", letterSpacing: "3px", marginBottom: "2px",
        }}>⚔️ THE DUNGEON MASTER ⚔️</div>
        <div style={{ fontSize: "9px", color: "#4a3020", letterSpacing: "2px", fontFamily: "'Cinzel',serif", marginBottom: "8px" }}>
          {setting.toUpperCase()} · {personality.toUpperCase()} · CODE: {sessionId}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap" }}>
          {[
            { label: voiceOn ? "🔊 Voice" : "🔇 Voice", action: () => setVoiceOn(v => !v), active: voiceOn },
            { label: "🎲 Dice", action: () => setShowDice(true), active: false },
            { label: "📋 Sheet", action: () => setShowSheet(true), active: false },
            { label: "🏆 Quests" + (activeQuests.length ? " (" + activeQuests.length + ")" : ""), action: () => setShowQuests(v => !v), active: showQuests },
          ].map(btn => (
            <button key={btn.label} className="cb" onClick={btn.action} style={{
              background: btn.active ? "rgba(212,170,60,.14)" : "rgba(30,15,5,.6)",
              border: "1px solid " + (btn.active ? "#c8943a" : "rgba(200,148,58,.2)"),
              color: btn.active ? "#f4c842" : "#8a6040",
              borderRadius: "18px", padding: "4px 12px", fontSize: "11px",
              cursor: "pointer", fontFamily: "'Cinzel',serif", letterSpacing: "1px", transition: "all .2s",
            }}>{btn.label}</button>
          ))}

          {speaking && (
            <button className="cb" onClick={stopAudio} style={{
              background: "rgba(200,80,80,.15)", border: "1px solid #c84040",
              color: "#ff8080", borderRadius: "18px", padding: "4px 12px",
              fontSize: "11px", cursor: "pointer", fontFamily: "'Cinzel',serif",
            }}>⏹ Stop</button>
          )}
          {!speaking && lastDM && (
            <button className="cb" onClick={() => speak(lastDM.content)} style={{
              background: "rgba(80,160,100,.1)", border: "1px solid #4a7a5a",
              color: "#70c080", borderRadius: "18px", padding: "4px 12px",
              fontSize: "11px", cursor: "pointer", fontFamily: "'Cinzel',serif",
            }}>🔁 Replay</button>
          )}
          <button className="cb" onClick={onLeave} style={{
            background: "rgba(40,20,10,.4)", border: "1px solid rgba(200,148,58,.12)",
            color: "#4a3020", borderRadius: "18px", padding: "4px 12px",
            fontSize: "11px", cursor: "pointer", fontFamily: "'Cinzel',serif",
          }}>✕ Leave</button>
        </div>
      </header>

      {/* ── SCENE IMAGE ── */}
      {(sceneImage || imageLoading) && (
        <div style={{
          position: "relative", zIndex: 5, maxWidth: "880px", width: "100%", margin: "0 auto",
          padding: "12px 16px 0",
        }}>
          {imageLoading ? (
            <div style={{
              width: "100%", height: "180px", background: "rgba(20,10,5,.6)",
              borderRadius: "12px", border: "1px solid rgba(200,148,58,.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#5a4030", fontFamily: "'Cinzel',serif", fontSize: "12px", letterSpacing: "2px",
            }}>🖼️ PAINTING THE SCENE...</div>
          ) : (
            <img src={sceneImage} alt="Scene" style={{
              width: "100%", maxHeight: "260px", objectFit: "cover",
              borderRadius: "12px", border: "1px solid rgba(200,148,58,.3)",
              animation: "imgfade .8s ease",
              boxShadow: "0 4px 30px rgba(0,0,0,.7)",
            }} />
          )}
        </div>
      )}

      {/* ── QUEST PANEL ── */}
      {showQuests && (
        <div style={{
          position: "relative", zIndex: 5, maxWidth: "880px", width: "100%", margin: "0 auto",
          padding: "10px 16px 0",
        }}>
          <div style={{
            background: "rgba(20,10,5,.9)", border: "1px solid rgba(200,148,58,.25)",
            borderRadius: "10px", padding: "14px",
          }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: "11px", color: "#8a6030", letterSpacing: "2px", marginBottom: "10px" }}>🏆 ACTIVE QUESTS</div>
            {activeQuests.length === 0 ? (
              <div style={{ color: "#5a4030", fontSize: "14px", fontFamily: "'Crimson Text',serif" }}>No quests yet — adventure awaits!</div>
            ) : activeQuests.map(q => (
              <div key={q.id} style={{ padding: "8px 10px", marginBottom: "6px", background: "rgba(0,0,0,.3)", borderRadius: "6px", border: "1px solid rgba(200,148,58,.15)" }}>
                <div style={{ color: "#d4aa3c", fontFamily: "'Cinzel',serif", fontSize: "12px" }}>{q.title}</div>
                <div style={{ color: "#8a7050", fontSize: "13px", marginTop: "3px", fontFamily: "'Crimson Text',serif" }}>{q.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MESSAGES ── */}
      <main style={{
        flex: 1, overflowY: "auto", padding: "16px",
        position: "relative", zIndex: 5,
        maxWidth: "880px", width: "100%", margin: "0 auto",
      }}>
        {messages.map((msg, i) => (
          <div key={msg.id || i} style={{
            animation: "fadeUp .35s ease forwards", marginBottom: "18px",
            display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: "radial-gradient(circle,#4a2a0a,#1a0a00)",
                border: "2px solid #c8943a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, marginRight: 9, marginTop: 4,
                boxShadow: "0 0 10px rgba(200,148,58,.35)",
                animation: "breathe 4s ease-in-out infinite",
              }}>🐉</div>
            )}
            <div style={{
              maxWidth: "82%",
              background: msg.role === "assistant"
                ? "linear-gradient(135deg,rgba(24,11,3,.97),rgba(14,7,24,.97))"
                : "linear-gradient(135deg,rgba(34,18,5,.93),rgba(44,24,3,.93))",
              border: "1px solid " + (msg.role === "assistant" ? "rgba(200,148,58,.32)" : "rgba(180,130,40,.22)"),
              borderRadius: msg.role === "assistant" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
              padding: "12px 16px", lineHeight: 1.78, fontSize: "15px",
              color: msg.role === "assistant" ? "#e8d5a3" : "#f0e0b0",
              boxShadow: "0 4px 16px rgba(0,0,0,.4)",
              fontFamily: "'Crimson Text',Georgia,serif",
            }}>
              <div style={{
                fontFamily: "'Cinzel',serif", fontSize: "9px", letterSpacing: "2px",
                color: msg.role === "assistant" ? "#c8943a" : "#b09040",
                marginBottom: 6, textAlign: msg.role === "user" ? "right" : "left",
              }}>{msg.role === "assistant" ? "Dungeon Master" : (msg.player || playerName)}</div>
              <div dangerouslySetInnerHTML={{ __html: fmt(msg.content) }} />
            </div>
            {msg.role === "user" && (
              <div style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: "radial-gradient(circle,#2a1a00,#100800)",
                border: "2px solid #a07830",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, marginLeft: 9, marginTop: 4,
              }}>⚔️</div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "radial-gradient(circle,#4a2a0a,#1a0a00)",
              border: "2px solid #c8943a",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              animation: "glow 1.4s infinite",
            }}>🐉</div>
            <div style={{
              background: "rgba(24,11,3,.95)", border: "1px solid rgba(200,148,58,.28)",
              borderRadius: "4px 16px 16px 16px", padding: "12px 18px",
              display: "flex", gap: 5, alignItems: "center",
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#c8943a", opacity: .7,
                  animation: "bounce .9s " + (i * 0.18) + "s ease-in-out infinite",
                }} />
              ))}
              <span style={{ color: "#7a5030", fontSize: 12, marginLeft: 7, fontFamily: "'Cinzel',serif" }}>
                Consulting the ancient tomes...
              </span>
            </div>
          </div>
        )}

        {!isHost && (
          <div style={{ textAlign: "center", color: "#5a4030", fontSize: "13px", fontFamily: "'Crimson Text',serif", marginTop: "20px", fontStyle: "italic" }}>
            Watching as {playerName} — only the host can send messages
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* ── QUICK CHIPS ── */}
      {isHost && (
        <div style={{
          position: "relative", zIndex: 10,
          maxWidth: "880px", width: "100%", margin: "0 auto",
          padding: "0 16px 6px", display: "flex", gap: 6, flexWrap: "wrap",
        }}>
          {QUICK.map(q => (
            <button key={q} className="qb" onClick={() => send(q)} style={{
              background: "rgba(212,170,60,.06)", border: "1px solid rgba(212,170,60,.18)",
              color: "#907840", borderRadius: 14, padding: "3px 11px", fontSize: 11,
              cursor: "pointer", fontFamily: "'Crimson Text',Georgia,serif",
              transition: "all .15s", whiteSpace: "nowrap",
            }}>{q}</button>
          ))}
        </div>
      )}

      {/* ── INPUT ── */}
      {isHost && (
        <footer style={{
          position: "relative", zIndex: 10,
          background: "rgba(0,0,0,.72)", backdropFilter: "blur(14px)",
          borderTop: "1px solid rgba(212,170,60,.15)", padding: "10px 14px",
        }}>
          <div style={{ maxWidth: "880px", margin: "0 auto", display: "flex", gap: 9, alignItems: "flex-end" }}>
            <button onClick={startListening} style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: listening ? "radial-gradient(circle,#8b0000,#4a0000)" : "radial-gradient(circle,#2a1500,#100a00)",
              border: "2px solid " + (listening ? "#ff4040" : "#7a5018"),
              color: listening ? "#ff8080" : "#c8943a",
              fontSize: 16, cursor: "pointer",
              animation: listening ? "lpulse 1s infinite" : "none",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s",
            }}>{listening ? "🔴" : "🎤"}</button>

            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder={listening ? "🎤 Listening..." : "Type your action... (Enter to send)"}
              rows={2}
              style={{
                flex: 1, background: "rgba(14,7,3,.93)",
                border: "1px solid rgba(200,148,58,.25)", borderRadius: 9,
                padding: "10px 14px", color: "#e8d5a3", fontSize: 14, resize: "none",
                fontFamily: "'Crimson Text',Georgia,serif", lineHeight: 1.5,
              }}
            />

            <button onClick={() => setShowDice(true)} style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: "radial-gradient(circle,#1a0a2a,#0a0514)",
              border: "2px solid #6a4a9a", color: "#c090ff",
              fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>🎲</button>

            <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: (loading || !input.trim()) ? "radial-gradient(circle,#141414,#0a0a0a)" : "radial-gradient(circle,#5a3a00,#2a1800)",
              border: "2px solid " + ((loading || !input.trim()) ? "#1e1e1e" : "#d4aa3c"),
              color: (loading || !input.trim()) ? "#252525" : "#f4c842",
              fontSize: 18, cursor: (loading || !input.trim()) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: (!loading && input.trim()) ? "glow 2s infinite" : "none",
            }}>⚡</button>
          </div>

          <div style={{ textAlign: "center", marginTop: 5, fontSize: 9, color: "#2e1e08", fontFamily: "'Cinzel',serif", letterSpacing: "1px" }}>
            🎤 SPEAK · 🎲 ROLL · ⌨️ TYPE · ⚡ SEND
            {speaking && <span style={{ color: "#80e0a0", marginLeft: 10 }}>🔊 DM SPEAKING...</span>}
          </div>
        </footer>
      )}

      {/* ── OVERLAYS ── */}
      {showDice && <DiceRoller onRoll={handleDiceRoll} onClose={() => setShowDice(false)} />}
      {showSheet && <CharacterSheet character={myChar} playerName={playerName} onClose={() => setShowSheet(false)} />}
    </div>
  );
}
