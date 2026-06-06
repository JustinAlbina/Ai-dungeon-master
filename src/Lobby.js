import { useState } from "react";
import { supabase } from "./supabase";

const SETTINGS = ["High Fantasy", "Dark Fantasy", "Pirates & Seas", "Sci-Fi D&D", "Horror"];
const PERSONALITIES = ["Epic & Dramatic", "Funny & Casual", "Gritty & Serious", "Mysterious & Eerie"];

function randomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

const s = {
  wrap: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at 20% 0%, #1a0a2e 0%, #0d0d1a 40%, #000508 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "20px", fontFamily: "'Crimson Text', Georgia, serif",
  },
  card: {
    background: "linear-gradient(135deg, rgba(28,13,4,.97), rgba(14,7,22,.97))",
    border: "1px solid rgba(212,170,60,.4)", borderRadius: "16px",
    padding: "36px", maxWidth: "480px", width: "100%",
    boxShadow: "0 0 60px rgba(0,0,0,.8)",
  },
  title: {
    fontFamily: "'Cinzel', serif", fontSize: "26px", fontWeight: 700,
    background: "linear-gradient(135deg, #f4c842, #e8a020, #f4c842)",
    backgroundSize: "200% auto",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    textAlign: "center", letterSpacing: "3px", marginBottom: "4px",
  },
  sub: {
    textAlign: "center", color: "#5a4025", fontSize: "11px",
    fontFamily: "'Cinzel', serif", letterSpacing: "2px", marginBottom: "28px",
  },
  label: {
    display: "block", color: "#c8a060", fontFamily: "'Cinzel', serif",
    fontSize: "11px", letterSpacing: "1.5px", marginBottom: "7px", marginTop: "18px",
  },
  input: {
    width: "100%", background: "rgba(10,5,20,.9)",
    border: "1px solid rgba(200,148,58,.3)", borderRadius: "8px",
    padding: "11px 14px", color: "#e8d5a3", fontSize: "15px",
    fontFamily: "'Crimson Text', Georgia, serif", outline: "none",
  },
  select: {
    width: "100%", background: "rgba(10,5,20,.9)",
    border: "1px solid rgba(200,148,58,.3)", borderRadius: "8px",
    padding: "11px 14px", color: "#e8d5a3", fontSize: "14px",
    fontFamily: "'Crimson Text', Georgia, serif", outline: "none", cursor: "pointer",
  },
  btn: {
    width: "100%", marginTop: "22px", padding: "13px",
    background: "linear-gradient(135deg, #5a3a00, #3a2000)",
    border: "1px solid #c8943a", borderRadius: "8px",
    color: "#f4c842", fontFamily: "'Cinzel', serif",
    fontSize: "13px", letterSpacing: "2px", cursor: "pointer", transition: "all .2s",
  },
  divider: { border: "none", borderTop: "1px solid rgba(200,148,58,.15)", margin: "24px 0" },
  err: { color: "#ff7070", fontSize: "13px", marginTop: "10px", textAlign: "center" },
  code: {
    fontFamily: "monospace", fontSize: "32px", letterSpacing: "8px",
    color: "#f4c842", textAlign: "center", padding: "16px",
    background: "rgba(0,0,0,.4)", borderRadius: "8px",
    border: "1px solid rgba(200,148,58,.3)", marginTop: "12px",
  },
};

export default function Lobby({ onJoin }) {
  const [mode, setMode]       = useState("choose"); // choose | host | join | hosting
  const [name, setName]       = useState("");
  const [code, setCode]       = useState("");
  const [setting, setSetting] = useState(SETTINGS[0]);
  const [personality, setPersonality] = useState(PERSONALITIES[0]);
  const [sessionCode, setSessionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const createSession = async () => {
    if (!name.trim()) { setError("Enter your name!"); return; }
    setLoading(true); setError("");
    const newCode = randomCode();
    const { error: err } = await supabase.from("sessions").insert({
      code: newCode,
      messages: [],
      characters: {},
      quests: [],
      scene_image: null,
      setting,
      personality,
      created_at: new Date().toISOString(),
    });
    if (err) { setError("Error creating session: " + err.message); setLoading(false); return; }
    setSessionCode(newCode);
    setMode("hosting");
    setLoading(false);
  };

  const startGame = () => {
    onJoin({ sessionId: sessionCode, playerName: name.trim(), isHost: true, setting, personality });
  };

  const joinSession = async () => {
    if (!name.trim()) { setError("Enter your name!"); return; }
    if (!code.trim()) { setError("Enter a session code!"); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase
      .from("sessions").select("*").eq("code", code.trim().toUpperCase()).single();
    if (err || !data) { setError("Session not found! Check the code."); setLoading(false); return; }
    onJoin({ sessionId: code.trim().toUpperCase(), playerName: name.trim(), isHost: false, setting: data.setting, personality: data.personality });
    setLoading(false);
  };

  if (mode === "hosting") return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.title}>⚔️ SESSION CREATED</div>
        <div style={s.sub}>SHARE THIS CODE WITH YOUR FRIENDS</div>
        <div style={s.code}>{sessionCode}</div>
        <div style={{ color: "#9a8060", fontSize: "14px", textAlign: "center", marginTop: "14px", lineHeight: 1.6 }}>
          Friends go to this site, click "Join Session", enter the code and their name.
          Once everyone is in, start the adventure!
        </div>
        <button style={s.btn} onClick={startGame}>⚔️ ENTER THE DUNGEON</button>
      </div>
    </div>
  );

  if (mode === "host") return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.title}>⚔️ HOST SESSION</div>
        <div style={s.sub}>SET UP YOUR CAMPAIGN</div>
        <label style={s.label}>YOUR NAME</label>
        <input style={s.input} placeholder="e.g. Justin" value={name} onChange={e => setName(e.target.value)} />
        <label style={s.label}>CAMPAIGN SETTING</label>
        <select style={s.select} value={setting} onChange={e => setSetting(e.target.value)}>
          {SETTINGS.map(s => <option key={s}>{s}</option>)}
        </select>
        <label style={s.label}>DM PERSONALITY</label>
        <select style={s.select} value={personality} onChange={e => setPersonality(e.target.value)}>
          {PERSONALITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        {error && <div style={s.err}>{error}</div>}
        <button style={s.btn} onClick={createSession} disabled={loading}>
          {loading ? "Creating..." : "⚔️ CREATE SESSION"}
        </button>
        <div style={{ textAlign: "center", marginTop: "14px", color: "#5a4030", fontSize: "13px", cursor: "pointer" }}
          onClick={() => setMode("choose")}>← Back</div>
      </div>
    </div>
  );

  if (mode === "join") return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.title}>⚔️ JOIN SESSION</div>
        <div style={s.sub}>ENTER YOUR DETAILS</div>
        <label style={s.label}>YOUR NAME</label>
        <input style={s.input} placeholder="e.g. Mikayla" value={name} onChange={e => setName(e.target.value)} />
        <label style={s.label}>SESSION CODE</label>
        <input style={{ ...s.input, textTransform: "uppercase", letterSpacing: "4px", fontSize: "20px" }}
          placeholder="XXXXX" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={5} />
        {error && <div style={s.err}>{error}</div>}
        <button style={s.btn} onClick={joinSession} disabled={loading}>
          {loading ? "Joining..." : "⚔️ JOIN ADVENTURE"}
        </button>
        <div style={{ textAlign: "center", marginTop: "14px", color: "#5a4030", fontSize: "13px", cursor: "pointer" }}
          onClick={() => setMode("choose")}>← Back</div>
      </div>
    </div>
  );

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.title}>⚔️ THE DUNGEON MASTER</div>
        <div style={s.sub}>AI-POWERED D&D · BEGINNERS WELCOME</div>
        <div style={{ color: "#9a8060", fontSize: "15px", lineHeight: 1.7, marginBottom: "8px", textAlign: "center" }}>
          Gather your party and embark on an epic adventure — fully guided by AI.
          No experience needed.
        </div>
        <hr style={s.divider} />
        <button style={s.btn} onClick={() => setMode("host")}>🐉 HOST A SESSION</button>
        <button style={{ ...s.btn, marginTop: "12px", background: "linear-gradient(135deg, #0a1a2a, #050e18)", borderColor: "#4a6a8a", color: "#80b0d0" }}
          onClick={() => setMode("join")}>🗝️ JOIN A SESSION</button>
      </div>
    </div>
  );
}
