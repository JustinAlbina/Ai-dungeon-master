import { useState } from "react";
import { supabase } from "./supabase";

const SETTINGS = ["High Fantasy","Dark Fantasy","Pirates & Seas","Sci-Fi D&D","Horror"];
const PERSONALITIES = ["Epic & Dramatic","Funny & Casual","Gritty & Serious","Mysterious & Eerie"];

function randomCode() { return Math.random().toString(36).substring(2,7).toUpperCase(); }

const inp = { width:"100%", background:"rgba(10,5,20,.9)", border:"1px solid rgba(200,148,58,.3)", borderRadius:"8px", padding:"11px 14px", color:"#e8d5a3", fontSize:"15px", fontFamily:"'Crimson Text',Georgia,serif", outline:"none", boxSizing:"border-box" };
const sel = { ...inp, cursor:"pointer" };
const lbl = { display:"block", color:"#c8a060", fontFamily:"'Cinzel',serif", fontSize:"11px", letterSpacing:"1.5px", marginBottom:"7px", marginTop:"18px" };
const btn = (active=true,extra={}) => ({ width:"100%", marginTop:"14px", padding:"13px", background:active?"linear-gradient(135deg,#5a3a00,#3a2000)":"rgba(30,15,5,.4)", border:"1px solid "+(active?"#c8943a":"rgba(200,148,58,.1)"), borderRadius:"8px", color:active?"#f4c842":"#4a3020", fontFamily:"'Cinzel',serif", fontSize:"13px", letterSpacing:"2px", cursor:active?"pointer":"not-allowed", transition:"all .2s", ...extra });

const wrap = { minHeight:"100vh", background:"radial-gradient(ellipse at 20% 0%,#1a0a2e 0%,#0d0d1a 40%,#000508 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"'Crimson Text',Georgia,serif" };
const card = { background:"linear-gradient(135deg,rgba(28,13,4,.97),rgba(14,7,22,.97))", border:"1px solid rgba(212,170,60,.4)", borderRadius:"16px", padding:"36px", maxWidth:"460px", width:"100%", boxShadow:"0 0 60px rgba(0,0,0,.8)" };
const title = (text) => <div style={{fontFamily:"'Cinzel',serif",fontSize:"20px",fontWeight:700,background:"linear-gradient(135deg,#f4c842,#e8a020)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",textAlign:"center",letterSpacing:"3px",marginBottom:"20px"}}>{text}</div>;

export default function Lobby({ onJoin }) {
  const [mode, setMode]           = useState("choose");
  const [name, setName]           = useState("");
  const [code, setCode]           = useState("");
  const [setting, setSetting]     = useState(SETTINGS[0]);
  const [personality, setPersonality] = useState(PERSONALITIES[0]);
  const [playerCount, setPlayerCount] = useState(2);
  const [sessionCode, setSessionCode] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const createSession = async () => {
    if (!name.trim()) { setError("Enter your name!"); return; }
    setLoading(true); setError("");
    const newCode = randomCode();
    const { error: err } = await supabase.from("sessions").insert({
      code: newCode, messages: [], characters: {}, quests: [],
      scene_image: null, setting, personality, player_count: playerCount,
      players: {}, initiative: [], current_turn: null, started: false,
      created_at: new Date().toISOString(),
    });
    if (err) { setError("Error: " + err.message); setLoading(false); return; }
    setSessionCode(newCode);
    setMode("hosting");
    setLoading(false);
  };

  const joinSession = async () => {
    if (!name.trim()) { setError("Enter your name!"); return; }
    if (!code.trim()) { setError("Enter a session code!"); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.from("sessions").select("*").eq("code", code.trim().toUpperCase()).single();
    if (err || !data) { setError("Session not found! Check the code."); setLoading(false); return; }
    onJoin({ sessionId: code.trim().toUpperCase(), playerName: name.trim(), isHost: false, setting: data.setting, personality: data.personality, playerCount: data.player_count || 2 });
    setLoading(false);
  };

  if (mode === "hosting") return (
    <div style={wrap}><div style={card}>
      {title("⚔️ SESSION READY")}
      <div style={{textAlign:"center",color:"#5a4025",fontFamily:"'Cinzel',serif",fontSize:"10px",letterSpacing:"2px",marginBottom:"16px"}}>SHARE THIS CODE WITH YOUR PARTY</div>
      <div style={{fontFamily:"monospace",fontSize:"36px",letterSpacing:"10px",color:"#f4c842",textAlign:"center",padding:"18px",background:"rgba(0,0,0,.4)",borderRadius:"10px",border:"1px solid rgba(200,148,58,.3)",marginBottom:"16px"}}>{sessionCode}</div>
      <div style={{color:"#7a6040",fontSize:"14px",textAlign:"center",lineHeight:1.7,marginBottom:"4px"}}>
        Friends visit the site → Join Session → enter code + their name → create their character.<br/>
        <strong style={{color:"#c8943a"}}>Once everyone is ready, YOU click Start!</strong>
      </div>
      <div style={{color:"#5a4030",fontSize:"13px",textAlign:"center",marginBottom:"4px"}}>Expecting <strong style={{color:"#c8943a"}}>{playerCount} player{playerCount>1?"s":""}</strong></div>
      <button style={btn()} onClick={()=>onJoin({sessionId:sessionCode,playerName:name.trim(),isHost:true,setting,personality,playerCount})}>⚔️ ENTER & WAIT FOR PARTY</button>
    </div></div>
  );

  if (mode === "host") return (
    <div style={wrap}><div style={card}>
      {title("🐉 HOST SESSION")}
      <label style={lbl}>YOUR NAME</label>
      <input style={inp} placeholder="e.g. Justin" value={name} onChange={e=>setName(e.target.value)} />
      <label style={lbl}>NUMBER OF PLAYERS</label>
      <div style={{display:"flex",gap:"8px",marginTop:"4px"}}>
        {[1,2,3,4,5,6].map(n=>(
          <button key={n} onClick={()=>setPlayerCount(n)} style={{flex:1,padding:"10px 0",borderRadius:"8px",border:"1px solid "+(playerCount===n?"#c8943a":"rgba(200,148,58,.15)"),background:playerCount===n?"linear-gradient(135deg,#3a2000,#2a1200)":"rgba(20,10,5,.6)",color:playerCount===n?"#f4c842":"#7a5030",fontFamily:"'Cinzel',serif",fontSize:"14px",cursor:"pointer",transition:"all .15s"}}>{n}</button>
        ))}
      </div>
      <label style={lbl}>CAMPAIGN SETTING</label>
      <select style={sel} value={setting} onChange={e=>setSetting(e.target.value)}>{SETTINGS.map(s=><option key={s}>{s}</option>)}</select>
      <label style={lbl}>DM PERSONALITY</label>
      <select style={sel} value={personality} onChange={e=>setPersonality(e.target.value)}>{PERSONALITIES.map(p=><option key={p}>{p}</option>)}</select>
      {error && <div style={{color:"#ff7070",fontSize:"13px",marginTop:"10px",textAlign:"center"}}>{error}</div>}
      <button style={btn(!loading)} onClick={createSession} disabled={loading}>{loading?"Creating...":"⚔️ CREATE SESSION"}</button>
      <div style={{textAlign:"center",marginTop:"12px",color:"#4a3020",fontSize:"13px",cursor:"pointer"}} onClick={()=>setMode("choose")}>← Back</div>
    </div></div>
  );

  if (mode === "join") return (
    <div style={wrap}><div style={card}>
      {title("🗝️ JOIN SESSION")}
      <label style={lbl}>YOUR NAME</label>
      <input style={inp} placeholder="e.g. Mikayla" value={name} onChange={e=>setName(e.target.value)} />
      <label style={lbl}>SESSION CODE</label>
      <input style={{...inp,textTransform:"uppercase",letterSpacing:"6px",fontSize:"22px",textAlign:"center"}} placeholder="XXXXX" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={5} />
      {error && <div style={{color:"#ff7070",fontSize:"13px",marginTop:"10px",textAlign:"center"}}>{error}</div>}
      <button style={btn(!loading)} onClick={joinSession} disabled={loading}>{loading?"Joining...":"⚔️ JOIN ADVENTURE"}</button>
      <div style={{textAlign:"center",marginTop:"12px",color:"#4a3020",fontSize:"13px",cursor:"pointer"}} onClick={()=>setMode("choose")}>← Back</div>
    </div></div>
  );

  return (
    <div style={wrap}><div style={card}>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"24px",fontWeight:700,background:"linear-gradient(135deg,#f4c842 0%,#e8a020 40%,#f4c842 80%)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",textAlign:"center",letterSpacing:"3px",marginBottom:"4px"}}>⚔️ THE DUNGEON MASTER</div>
      <div style={{textAlign:"center",color:"#4a3020",fontFamily:"'Cinzel',serif",fontSize:"10px",letterSpacing:"2px",marginBottom:"24px"}}>AI-POWERED D&D · BEGINNERS WELCOME</div>
      <div style={{color:"#8a7050",fontSize:"15px",lineHeight:1.7,textAlign:"center",marginBottom:"20px"}}>Gather your party and embark on an epic adventure — fully guided by AI. No experience needed.</div>
      <button style={btn()} onClick={()=>setMode("host")}>🐉 HOST A SESSION</button>
      <button style={{...btn(),marginTop:"10px",background:"linear-gradient(135deg,#0a1a2a,#050e18)",borderColor:"#4a6a8a",color:"#80b0d0"}} onClick={()=>setMode("join")}>🗝️ JOIN A SESSION</button>
    </div></div>
  );
}
