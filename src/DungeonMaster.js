import { useState, useEffect, useRef, useCallback } from "react";

const SYSTEM_PROMPT = `You are an expert, engaging Dungeons & Dragons Dungeon Master running a campaign for a group of complete beginners who have NEVER played D&D before. Your job is to:

1. TEACH as you play — explain rules naturally when they come up, never overwhelm with rules dumps
2. RUN the entire game — combat, roleplay, exploration, everything
3. CREATE an original campaign — start with a compelling hook and evolve the story based on player choices
4. MANAGE all NPCs, monsters, dice rolls (you roll dice and report results), and world state
5. KEEP TRACK of each character's HP, stats, spells, inventory as players give you their sheets
6. BE DRAMATIC and descriptive — paint vivid pictures with words
7. BE FORGIVING — beginners make mistakes, gently guide them

CAMPAIGN SETUP FLOW:
- Warmly welcome everyone and explain D&D in 2-3 sentences
- Ask how many players there are and their names
- Walk each player through choosing a class (Fighter, Wizard, Rogue, Cleric, Ranger, Paladin, Bard, Druid) — describe each briefly
- Assign level 1 stats automatically (don't make beginners roll stats)
- Give starting equipment
- Begin the adventure with a compelling opening scene

DURING PLAY:
- When players act, decide if a dice roll is needed
- Roll dice yourself: [rolled 14, +3 modifier = 17, SUCCESS]
- Describe outcomes vividly; always state HP after combat
- Use character names; give NPCs distinct voices
- Build tension, mystery, humor — make it FUN
- Every 3-4 exchanges, give players a meaningful choice

FORMATTING:
- **bold** for game terms, names, dramatic moments
- *italics* for atmosphere and NPC speech
- 🎲 narration · 📜 rules · ⚔️ combat
- Keep responses engaging but conversational — not too long
- NEVER use markdown tables (| pipes) — describe class options as a simple list instead

Begin by warmly welcoming the players!`;

function fmt(text) {
  // Convert markdown tables to HTML
  const lines = text.split("\n");
  let inTable = false;
  let result = [];
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      if (!inTable) { inTable = true; tableRows = []; }
      // skip separator rows like |---|---|
      if (/^[\s|:-]+$/.test(line)) continue;
      const cells = line.split("|").filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim());
      tableRows.push(cells);
    } else {
      if (inTable) {
        // flush table
        let html = '<table style="border-collapse:collapse;margin:8px 0;font-size:14px;width:100%">';
        tableRows.forEach((row, ri) => {
          html += "<tr>";
          row.forEach(cell => {
            const tag = ri === 0 ? "th" : "td";
            html += \`<\${tag} style="border:1px solid rgba(200,148,58,.3);padding:6px 10px;text-align:left">\${cell}<\/\${tag}>\`;
          });
          html += "</tr>";
        });
        html += "</table>";
        result.push(html);
        inTable = false; tableRows = [];
      }
      result.push(line);
    }
  }
  if (inTable && tableRows.length) {
    let html = '<table style="border-collapse:collapse;margin:8px 0;font-size:14px;width:100%">';
    tableRows.forEach((row, ri) => {
      html += "<tr>";
      row.forEach(cell => {
        const tag = ri === 0 ? "th" : "td";
        html += \`<\${tag} style="border:1px solid rgba(200,148,58,.3);padding:6px 10px;text-align:left">\${cell}<\/\${tag}>\`;
      });
      html += "</tr>";
    });
    html += "</table>";
    result.push(html);
  }

  return result.join("\n")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

function clean(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/[🎲📜⚔️🏰🐉⚡🎭]/gu, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\|[-:]+\|[-|: ]*/g, " ")  // strip table separators
    .replace(/\|/g, " ")                  // strip remaining pipes
    .replace(/<br\/>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 2500);
}

const QUICK = [
  "What are my options?",
  "What's my HP?",
  "I look around carefully",
  "I talk to the NPC",
  "I attack!",
  "Explain that rule please",
];

export default function DungeonMaster() {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn]   = useState(true);
  const [ready, setReady]       = useState(false);

  const bottomRef   = useRef(null);
  const audioRef    = useRef(null);
  const synthRef    = useRef(window.speechSynthesis);
  const kaRef       = useRef(null); // keepalive

  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      dur: Math.random() * 12 + 8,
      delay: Math.random() * 6,
    }))
  );

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => { if (!ready) { setReady(true); launch(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Claude via server proxy ──────────────────────────────────────
  const askClaude = async (history) => {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: history.map(m => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `Error ${res.status}`); }
    const data = await res.json();
    return data.content?.[0]?.text || "The DM ponders in silence...";
  };

  // ── ElevenLabs via server proxy ──────────────────────────────────
  const speakElevenLabs = useCallback(async (text) => {
    try {
      setSpeaking(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean(text) }),
      });
      if (!res.ok) { setSpeaking(false); return false; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current._url); }
      const audio = new Audio(url);
      audio._url  = url;
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeaking(false); };
      await audio.play();
      return true;
    } catch { setSpeaking(false); return false; }
  }, []);

  // ── Browser TTS fallback ─────────────────────────────────────────
  const speakBrowser = useCallback((text) => {
    const t = clean(text); if (!t) return;
    synthRef.current.cancel();
    clearInterval(kaRef.current);
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(t);
      u.rate = 0.88; u.pitch = 0.82; u.volume = 1;
      const vs = synthRef.current.getVoices();
      const v  = vs.find(v => v.name.includes("UK English Male") || v.name.includes("Daniel") || v.name.includes("Google UK"))
               || vs.find(v => v.lang.startsWith("en")) || vs[0];
      if (v) u.voice = v;
      u.onstart = () => { setSpeaking(true); kaRef.current = setInterval(() => { if (synthRef.current.paused) synthRef.current.resume(); }, 10000); };
      u.onend   = () => { setSpeaking(false); clearInterval(kaRef.current); };
      u.onerror = (e) => { if (e.error !== "interrupted") setSpeaking(false); clearInterval(kaRef.current); };
      synthRef.current.speak(u);
    }, 120);
  }, []);

  const speak = useCallback(async (text) => {
    if (!voiceOn || !text) return;
    stopAudio();
    const ok = await speakElevenLabs(text);
    if (!ok) speakBrowser(text);
  }, [voiceOn, speakElevenLabs, speakBrowser]);

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    synthRef.current.cancel();
    clearInterval(kaRef.current);
    setSpeaking(false);
  };

  // ── Speech Recognition ───────────────────────────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition needs Chrome — type your action instead!"); return; }
    stopAudio();
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
    rec.onstart  = () => setListening(true);
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror  = () => setListening(false);
    rec.onend    = () => setListening(false);
    rec.start();
  };

  // ── Game flow ────────────────────────────────────────────────────
  const launch = async () => {
    setLoading(true);
    try {
      const reply = await askClaude([{ role: "user", content: "Begin the session! Welcome us and start the campaign setup." }]);
      const msg = { role: "assistant", content: reply, id: Date.now() };
      setMessages([msg]);
      speak(reply);
    } catch (e) {
      setMessages([{ role: "assistant", content: `⚠️ ${e.message}`, id: Date.now() }]);
    }
    setLoading(false);
  };

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text, id: Date.now() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    stopAudio();
    try {
      const reply = await askClaude(history);
      const dmMsg = { role: "assistant", content: reply, id: Date.now() + 1 };
      setMessages(p => [...p, dmMsg]);
      speak(reply);
    } catch (e) {
      setMessages(p => [...p, { role: "assistant", content: `⚠️ ${e.message}`, id: Date.now() + 1 }]);
    }
    setLoading(false);
  };

  const lastDM = [...messages].reverse().find(m => m.role === "assistant");

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 0%,#1a0a2e 0%,#0d0d1a 40%,#000508 100%)",
      fontFamily: "'Palatino Linotype','Book Antiqua',Georgia,serif",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden", color: "#e8d5a3",
    }}>

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: "fixed", left: `${p.x}%`, top: `${p.y}%`,
          width: `${p.size}px`, height: `${p.size}px`,
          background: "radial-gradient(circle,#f4c842,#c97b2a)",
          borderRadius: "50%", opacity: .35, pointerEvents: "none", zIndex: 0,
          boxShadow: "0 0 6px #f4c842",
          animation: `fp ${p.dur}s ${p.delay}s ease-in-out infinite alternate`,
        }} />
      ))}

      <style>{`
        @keyframes fp     { from{transform:translateY(0) scale(1);opacity:.22} to{transform:translateY(-28px) scale(1.2);opacity:.52} }
        @keyframes glow   { 0%,100%{box-shadow:0 0 14px rgba(212,170,60,.28)} 50%{box-shadow:0 0 32px rgba(212,170,60,.65)} }
        @keyframes lpulse { 0%,100%{box-shadow:0 0 0 0 rgba(220,80,80,.6)} 50%{box-shadow:0 0 0 11px rgba(220,80,80,0)} }
        @keyframes shimmer{ 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(13px)} to{opacity:1;transform:translateY(0)} }
        @keyframes breathe{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#0d0d1a} ::-webkit-scrollbar-thumb{background:#4a3520;border-radius:3px}
        textarea:focus{outline:none;box-shadow:0 0 0 1px rgba(200,148,58,.4)}
        .qb:hover{background:rgba(212,170,60,.18)!important}
        .cb:hover{opacity:.75}
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        position: "relative", zIndex: 10, textAlign: "center",
        padding: "20px 20px 13px",
        borderBottom: "1px solid rgba(212,170,60,.18)",
        background: "rgba(0,0,0,.55)", backdropFilter: "blur(12px)",
      }}>
        <div style={{
          fontFamily: "'Cinzel',serif", fontSize: "clamp(17px,4vw,29px)", fontWeight: 700,
          background: "linear-gradient(135deg,#f4c842 0%,#e8a020 40%,#f4c842 80%)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          animation: "shimmer 4s linear infinite", letterSpacing: "3px", marginBottom: "3px",
        }}>⚔️ THE DUNGEON MASTER ⚔️</div>
        <div style={{ fontSize: "10px", color: "#5a4025", letterSpacing: "2px", fontFamily: "'Cinzel',serif" }}>
          AI-POWERED · BEGINNERS WELCOME · NO SETUP REQUIRED
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
          <button className="cb" onClick={() => setVoiceOn(v => !v)} style={{
            background: voiceOn ? "rgba(212,170,60,.12)" : "rgba(50,50,50,.2)",
            border: `1px solid ${voiceOn ? "#c8943a" : "#3a3a3a"}`,
            color: voiceOn ? "#f4c842" : "#555",
            borderRadius: "20px", padding: "4px 13px", fontSize: "12px",
            cursor: "pointer", fontFamily: "'Cinzel',serif", letterSpacing: "1px", transition: "all .2s",
          }}>{voiceOn ? "🔊 Voice ON" : "🔇 Voice OFF"}</button>

          {speaking && (
            <button className="cb" onClick={stopAudio} style={{
              background: "rgba(200,80,80,.17)", border: "1px solid #c84040",
              color: "#ff8080", borderRadius: "20px", padding: "4px 13px",
              fontSize: "12px", cursor: "pointer", fontFamily: "'Cinzel',serif",
            }}>⏹ Stop</button>
          )}

          {!speaking && lastDM && (
            <button className="cb" onClick={() => speak(lastDM.content)} style={{
              background: "rgba(100,180,120,.1)", border: "1px solid #4a7a5a",
              color: "#80c890", borderRadius: "20px", padding: "4px 13px",
              fontSize: "12px", cursor: "pointer", fontFamily: "'Cinzel',serif", transition: "all .2s",
            }}>🔁 Replay</button>
          )}
        </div>
      </header>

      {/* ── MESSAGES ── */}
      <main style={{
        flex: 1, overflowY: "auto", padding: "20px 16px",
        position: "relative", zIndex: 5,
        maxWidth: "880px", width: "100%", margin: "0 auto",
      }}>
        {messages.map((msg, i) => (
          <div key={msg.id || i} style={{
            animation: "fadeUp .38s ease forwards", marginBottom: "20px",
            display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                background: "radial-gradient(circle,#4a2a0a,#1a0a00)",
                border: "2px solid #c8943a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, marginRight: 10, marginTop: 4,
                boxShadow: "0 0 12px rgba(200,148,58,.38)",
                animation: "breathe 4s ease-in-out infinite",
              }}>🐉</div>
            )}
            <div style={{
              maxWidth: "82%",
              background: msg.role === "assistant"
                ? "linear-gradient(135deg,rgba(26,12,3,.97),rgba(16,8,26,.97))"
                : "linear-gradient(135deg,rgba(36,20,6,.93),rgba(46,26,3,.93))",
              border: `1px solid ${msg.role === "assistant" ? "rgba(200,148,58,.35)" : "rgba(180,130,40,.25)"}`,
              borderRadius: msg.role === "assistant" ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
              padding: "13px 17px", lineHeight: 1.78, fontSize: "15.5px",
              color: msg.role === "assistant" ? "#e8d5a3" : "#f0e0b0",
              boxShadow: "0 4px 18px rgba(0,0,0,.45)",
              fontFamily: "'Crimson Text',Georgia,serif",
            }}>
              <div style={{
                fontFamily: "'Cinzel',serif", fontSize: "10px", letterSpacing: "2px",
                color: msg.role === "assistant" ? "#c8943a" : "#b09040",
                marginBottom: 7,
                textAlign: msg.role === "user" ? "right" : "left",
              }}>{msg.role === "assistant" ? "Dungeon Master" : "Adventurers"}</div>
              <div dangerouslySetInnerHTML={{ __html: fmt(msg.content) }} />
            </div>
            {msg.role === "user" && (
              <div style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                background: "radial-gradient(circle,#2a1a00,#100800)",
                border: "2px solid #a07830",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, marginLeft: 10, marginTop: 4,
              }}>⚔️</div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "radial-gradient(circle,#4a2a0a,#1a0a00)",
              border: "2px solid #c8943a",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              animation: "glow 1.4s infinite",
            }}>🐉</div>
            <div style={{
              background: "rgba(26,12,3,.95)", border: "1px solid rgba(200,148,58,.32)",
              borderRadius: "4px 18px 18px 18px", padding: "14px 20px",
              display: "flex", gap: 6, alignItems: "center",
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#c8943a", opacity: .7,
                  animation: `bounce .9s ${i * 0.18}s ease-in-out infinite`,
                }} />
              ))}
              <span style={{ color: "#7a5030", fontSize: 13, marginLeft: 8, fontFamily: "'Cinzel',serif" }}>
                Consulting the ancient tomes...
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* ── QUICK CHIPS ── */}
      <div style={{
        position: "relative", zIndex: 10,
        maxWidth: "880px", width: "100%", margin: "0 auto",
        padding: "0 16px 6px", display: "flex", gap: 7, flexWrap: "wrap",
      }}>
        {QUICK.map(q => (
          <button key={q} className="qb" onClick={() => send(q)} style={{
            background: "rgba(212,170,60,.07)", border: "1px solid rgba(212,170,60,.2)",
            color: "#a08040", borderRadius: 16, padding: "4px 12px", fontSize: 12,
            cursor: "pointer", fontFamily: "'Crimson Text',Georgia,serif",
            transition: "all .15s", whiteSpace: "nowrap",
          }}>{q}</button>
        ))}
      </div>

      {/* ── INPUT ── */}
      <footer style={{
        position: "relative", zIndex: 10,
        background: "rgba(0,0,0,.72)", backdropFilter: "blur(14px)",
        borderTop: "1px solid rgba(212,170,60,.16)", padding: "12px 16px",
      }}>
        <div style={{ maxWidth: "880px", margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
          <button onClick={startListening} style={{
            width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
            background: listening ? "radial-gradient(circle,#8b0000,#4a0000)" : "radial-gradient(circle,#2a1500,#100a00)",
            border: `2px solid ${listening ? "#ff4040" : "#7a5018"}`,
            color: listening ? "#ff8080" : "#c8943a",
            fontSize: 18, cursor: "pointer",
            animation: listening ? "lpulse 1s infinite" : "none",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s",
          }}>{listening ? "🔴" : "🎤"}</button>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={listening ? "🎤 Listening..." : "Type your action or click 🎤 to speak... (Enter to send)"}
            rows={2}
            style={{
              flex: 1, background: "rgba(16,8,3,.93)",
              border: "1px solid rgba(200,148,58,.28)",
              borderRadius: 10, padding: "11px 15px",
              color: "#e8d5a3", fontSize: 15, resize: "none",
              fontFamily: "'Crimson Text',Georgia,serif", lineHeight: 1.5, transition: "border-color .2s",
            }}
          />

          <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{
            width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
            background: (loading || !input.trim()) ? "radial-gradient(circle,#161616,#0c0c0c)" : "radial-gradient(circle,#5a3a00,#2a1800)",
            border: `2px solid ${(loading || !input.trim()) ? "#222" : "#d4aa3c"}`,
            color: (loading || !input.trim()) ? "#2a2a2a" : "#f4c842",
            fontSize: 20, cursor: (loading || !input.trim()) ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: (!loading && input.trim()) ? "glow 2s infinite" : "none", transition: "all .2s",
          }}>⚡</button>
        </div>

        <div style={{
          textAlign: "center", marginTop: 6, fontSize: 10, color: "#3a2810",
          fontFamily: "'Cinzel',serif", letterSpacing: "1px",
        }}>
          🎤 SPEAK · ⌨️ TYPE · ⚡ SEND
          {speaking && <span style={{ color: "#80e0a0", marginLeft: 10 }}>✨ DM IS SPEAKING...</span>}
        </div>
      </footer>
    </div>
  );
}
