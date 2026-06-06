import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import DiceRoller from "./DiceRoller";
import CharacterSheet from "./CharacterSheet";

function buildSystemPrompt(setting, personality, players) {
  const settingDesc = {
    "High Fantasy": "classic heroic fantasy world with kingdoms, dragons, elves, and epic quests",
    "Dark Fantasy": "grim, morally grey world of corruption, monsters, and hard choices",
    "Pirates & Seas": "swashbuckling world of ocean adventures, sea monsters, and pirate treasure",
    "Sci-Fi D&D": "futuristic world blending magic and technology, space travel and ancient ruins",
    "Horror": "terrifying world of dread, eldritch horrors, and survival against darkness",
  }[setting] || "classic fantasy world";
  const personalityDesc = {
    "Epic & Dramatic": "You speak with gravitas. Every moment feels legendary.",
    "Funny & Casual": "You are witty and fun, cracking jokes while telling a great story.",
    "Gritty & Serious": "You are serious and immersive. The world feels real and consequential.",
    "Mysterious & Eerie": "You speak in evocative mysterious tones. Everything feels unsettling.",
  }[personality] || "You are dramatic and engaging.";
  const playerList = players.map(p => p.playerName + " playing " + (p.name || p.playerName) + " the " + (p.race || "") + " " + (p.cls || "") + " backstory: " + (p.backstory || "adventurer")).join("; ");
  return "You are an expert DM for a " + settingDesc + " campaign. " + personalityDesc + "\nPlayers: " + (playerList || "unknown") + "\n\nRULES:\n1. Beginners - teach rules naturally as you go\n2. Run everything - combat, NPCs, dice, world\n3. Track HP/stats/inventory precisely\n4. Be forgiving and fun\n5. Welcome party by name referencing their backstories then launch opening scene\n\nDICE: Say Roll a d20! then report [Rolled 14 + 3 STR = 17 SUCCESS]\nAlways state HP after combat.\n\nAt END of response output these tags when relevant:\n\nCharacter updates:\n<SHEET_UPDATE>{\"playerName\":\"Justin\",\"character\":{\"name\":\"Theron\",\"cls\":\"Paladin\",\"race\":\"Human\",\"level\":1,\"hp\":12,\"maxHp\":12,\"ac\":18,\"stats\":{\"STR\":16,\"DEX\":10,\"CON\":14,\"INT\":10,\"WIS\":12,\"CHA\":14},\"abilities\":[{\"name\":\"Divine Sense\",\"desc\":\"Detect celestial/fiend/undead 60ft 4/day\"}],\"inventory\":[\"Longsword\",\"Shield\",\"Chain Mail\"],\"spells\":[]}}</SHEET_UPDATE>\n\nScene image when location changes:\n<SCENE_IMAGE>vivid 1-2 sentence visual description for image generation</SCENE_IMAGE>\n\nQuests:\n<QUEST_UPDATE>[{\"id\":\"q1\",\"title\":\"Quest Name\",\"desc\":\"Brief desc\",\"status\":\"active\"}]</QUEST_UPDATE>\n\nCombat initiative:\n<INITIATIVE>[\"Player1\",\"Player2\",\"Enemy1\"]</INITIATIVE>\n\nWhose turn:\n<TURN>PlayerName</TURN>\n\nFORMATTING: **bold** key terms, *italics* for atmosphere/NPC speech, # for headers. NO markdown tables. NO pipe characters.";
}

const TAGS = ["SHEET_UPDATE","SCENE_IMAGE","QUEST_UPDATE","INITIATIVE","TURN"];
function stripTags(text) {
  let t = text;
  TAGS.forEach(tag => { t = t.replace(new RegExp("<" + tag + ">[\\s\\S]*?<\\/" + tag + ">", "g"), ""); });
  return t.trim();
}

function fmt(text) {
  return stripTags(text)
    .replace(/^# (.+)$/gm, "<h2 style='font-family:Cinzel,serif;color:#f4c842;font-size:18px;letter-spacing:2px;margin:14px 0 8px'>$1</h2>")
    .replace(/^## (.+)$/gm, "<h3 style='font-family:Cinzel,serif;color:#d4aa3c;font-size:15px;letter-spacing:1px;margin:10px 0 5px'>$1</h3>")
    .replace(/^---+$/gm, "<hr style='border:none;border-top:1px solid rgba(200,148,58,.18);margin:10px 0'/>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

function cleanSpeech(text) {
  return stripTags(text)
    .replace(/^#{1,3} /gm,"").replace(/^---+$/gm,"")
    .replace(/\*\*(.*?)\*\*/g,"$1").replace(/\*(.*?)\*/g,"$1")
    .replace(/[🎲📜⚔️🏰🐉⚡🎭🔮🗡️🏹🛡️🌿💀⚓]/gu,"")
    .replace(/\[.*?\]/g,"").replace(/\|/g," ")
    .replace(/\s+/g," ").trim();
}

function parseTag(text, tag) {
  const m = text.match(new RegExp("<" + tag + ">([\\s\\S]*?)<\\/" + tag + ">"));
  if (!m) return null;
  if (tag === "SCENE_IMAGE" || tag === "TURN") return m[1].trim();
  try { return JSON.parse(m[1].trim()); } catch { return null; }
}

function parseAllSheets(text) {
  const regex = /<SHEET_UPDATE>([\s\S]*?)<\/SHEET_UPDATE>/g;
  const updates = {}; let m;
  while ((m = regex.exec(text)) !== null) {
    try { const d = JSON.parse(m[1].trim()); if (d.playerName) updates[d.playerName] = d.character; } catch {}
  }
  return updates;
}

function chunkText(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = []; let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > 500 && cur.length > 0) { chunks.push(cur.trim()); cur = s; } else cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length ? chunks : [text];
}

function classEmoji(cls) {
  const map = {Fighter:"⚔️",Wizard:"🔮",Rogue:"🗡️",Cleric:"✨",Ranger:"🏹",Paladin:"🛡️",Bard:"🎭",Druid:"🌿",Barbarian:"💢",Monk:"👊",Sorcerer:"⚡",Warlock:"👁️"};
  return map[cls] || "⚔️";
}

function ctrlBtn(active, borderColor, color) {
  return {
    background: active ? "rgba(212,170,60,.12)" : "rgba(24,12,3,.6)",
    border: "1px solid " + (borderColor || (active ? "#c8943a" : "rgba(200,148,58,.15)")),
    color: color || (active ? "#f4c842" : "#6a4020"),
    borderRadius:"16px", padding:"4px 11px", fontSize:"11px",
    cursor:"pointer", fontFamily:"'Cinzel',serif", letterSpacing:"1px", transition:"all .2s",
  };
}

function PlayerCard({ p, isMe, isTurn, initiative, onClick }) {
  const initPos = initiative.indexOf(p.playerName);
  return (
    <div onClick={onClick} style={{
      width:"70px", flexShrink:0, borderRadius:"10px", cursor: onClick ? "pointer" : "default",
      background: isTurn ? "linear-gradient(135deg,rgba(20,60,20,.9),rgba(10,40,10,.9))" : isMe ? "linear-gradient(135deg,rgba(40,20,5,.9),rgba(25,10,3,.9))" : "linear-gradient(135deg,rgba(20,10,5,.7),rgba(12,6,3,.7))",
      border:"1px solid " + (isTurn ? "#40c040" : isMe ? "#c8943a" : "rgba(200,148,58,.15)"),
      padding:"6px", textAlign:"center",
      animation: isTurn ? "turnpulse 1.5s infinite" : "none", transition:"all .2s",
    }}>
      <div style={{width:"46px",height:"46px",borderRadius:"8px",margin:"0 auto 4px",overflow:"hidden",background:"rgba(0,0,0,.4)",border:"1px solid rgba(200,148,58,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px"}}>
        {p.portrait ? <img src={p.portrait} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} /> : classEmoji(p.cls)}
      </div>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"8px",color:isTurn?"#80ff80":isMe?"#c8943a":"#7a5030",letterSpacing:"0.5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
        {p.name || p.playerName || "?"}
      </div>
      {p.hp !== undefined && p.maxHp && (
        <div style={{height:"3px",background:"rgba(0,0,0,.4)",borderRadius:"2px",marginTop:"3px",overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:"2px",transition:"width .3s",width:Math.max(0,Math.min(100,(p.hp/p.maxHp)*100))+"%",background:p.hp<p.maxHp*.3?"#ff4040":p.hp<p.maxHp*.6?"#ffaa00":"#40c040"}} />
        </div>
      )}
      {initPos >= 0 && <div style={{fontSize:"8px",color:"#8a6030",marginTop:"2px",fontFamily:"'Cinzel',serif"}}>#{initPos+1}</div>}
      {isTurn && <div style={{fontSize:"8px",color:"#80ff80",fontFamily:"'Cinzel',serif",marginTop:"1px"}}>TURN</div>}
    </div>
  );
}

const QUICK = ["What are my options?","What's my HP?","I look around carefully","I talk to the NPC","I attack!","Explain that rule","Recap the story so far"];

export default function Game({ session, character, onLeave }) {
  const { sessionId, playerName, isHost, setting, personality } = session;
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [speaking, setSpeaking]       = useState(false);
  const [listening, setListening]     = useState(false);
  const [voiceOn, setVoiceOn]         = useState(true);
  const [showDice, setShowDice]       = useState(false);
  const [showSheet, setShowSheet]     = useState(false);
  const [showQuests, setShowQuests]   = useState(false);
  const [characters, setCharacters]   = useState({});
  const [quests, setQuests]           = useState([]);
  const [sceneImage, setSceneImage]   = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [initiative, setInitiative]   = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [players, setPlayers]         = useState({});
  const [initialized, setInitialized] = useState(false);

  const bottomRef = useRef(null);
  const audioRef  = useRef(null);
  const stopRef   = useRef(false);
  const synthRef  = useRef(window.speechSynthesis);
  const kaRef     = useRef(null);

  const [particles] = useState(() => Array.from({length:16},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,size:Math.random()*3+1,dur:Math.random()*12+8,delay:Math.random()*6})));

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  useEffect(() => {
    const init = async () => {
      const {data} = await supabase.from("sessions").select("*").eq("code",sessionId).single();
      if (data) {
        const newPlayers = {...(data.players||{}), [playerName]:{...character,playerName}};
        await supabase.from("sessions").update({players:newPlayers}).eq("code",sessionId);
        setMessages(data.messages||[]);
        setCharacters(data.characters||{});
        setQuests(data.quests||[]);
        setSceneImage(data.scene_image||null);
        setInitiative(data.initiative||[]);
        setCurrentTurn(data.current_turn||null);
        setPlayers(newPlayers);
      }
    };
    init();
    const channel = supabase.channel("game:"+sessionId)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"sessions",filter:"code=eq."+sessionId},(payload)=>{
        const d=payload.new;
        setMessages(d.messages||[]);
        setCharacters(d.characters||{});
        setQuests(d.quests||[]);
        setPlayers(d.players||{});
        if(d.scene_image) setSceneImage(d.scene_image);
        if(d.initiative) setInitiative(d.initiative);
        if(d.current_turn!==undefined) setCurrentTurn(d.current_turn);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId,playerName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isHost && !initialized) {
      setInitialized(true);
      setTimeout(async () => {
        const {data} = await supabase.from("sessions").select("messages,players").eq("code",sessionId).single();
        if (!data?.messages?.length) launch(data?.players||{});
      }, 1200);
    }
  }, [isHost,initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = async (msgs,chars,qs,img,init,turn,pls) => {
    await supabase.from("sessions").update({messages:msgs,characters:chars,quests:qs,scene_image:img,initiative:init,current_turn:turn,players:pls}).eq("code",sessionId);
  };

  const speakChunk = async (chunk) => {
    const res = await fetch("/api/tts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:chunk,voice:"onyx"})});
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      if (stopRef.current) { URL.revokeObjectURL(url); resolve(false); return; }
      const audio = new Audio(url);
      audio._url=url; audioRef.current=audio;
      audio.onended=()=>{URL.revokeObjectURL(url);resolve(true);};
      audio.onerror=()=>{URL.revokeObjectURL(url);resolve(false);};
      audio.play().catch(()=>resolve(false));
    });
  };

  const speakOpenAI = useCallback(async (text) => {
    const t = cleanSpeech(text); if (!t) return false;
    stopRef.current=false; setSpeaking(true);
    for (const chunk of chunkText(t)) { if(stopRef.current) break; await speakChunk(chunk); }
    setSpeaking(false); return true;
  }, []);

  const speakBrowser = useCallback((text) => {
    const t=cleanSpeech(text); if(!t) return;
    synthRef.current.cancel(); clearInterval(kaRef.current);
    setTimeout(()=>{
      const u=new SpeechSynthesisUtterance(t);
      u.rate=0.88; u.pitch=0.82; u.volume=1;
      const vs=synthRef.current.getVoices();
      const v=vs.find(v=>v.name.includes("UK English Male")||v.name.includes("Daniel"))||vs.find(v=>v.lang.startsWith("en"))||vs[0];
      if(v) u.voice=v;
      u.onstart=()=>{setSpeaking(true);kaRef.current=setInterval(()=>{if(synthRef.current.paused)synthRef.current.resume();},10000);};
      u.onend=()=>{setSpeaking(false);clearInterval(kaRef.current);};
      u.onerror=(e)=>{if(e.error!=="interrupted")setSpeaking(false);clearInterval(kaRef.current);};
      synthRef.current.speak(u);
    },120);
  },[]);

  const stopAudio = useCallback(()=>{
    stopRef.current=true;
    if(audioRef.current){audioRef.current.pause();audioRef.current=null;}
    synthRef.current.cancel();clearInterval(kaRef.current);setSpeaking(false);
  },[]);

  const speak = useCallback(async(text)=>{
    if(!voiceOn||!text) return;
    stopAudio();
    const ok=await speakOpenAI(text);
    if(!ok) speakBrowser(text);
  },[voiceOn,speakOpenAI,speakBrowser,stopAudio]);

  const startListening = ()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Speech recognition needs Chrome!");return;}
    stopAudio();
    const rec=new SR();
    rec.continuous=false;rec.interimResults=false;rec.lang="en-US";
    rec.onstart=()=>setListening(true);
    rec.onresult=(e)=>{setInput(e.results[0][0].transcript);setListening(false);};
    rec.onerror=()=>setListening(false);
    rec.onend=()=>setListening(false);
    rec.start();
  };

  const askClaude = async(history,currentPlayers)=>{
    const playerArr=Object.values(currentPlayers||players);
    const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-opus-4-5",max_tokens:1200,system:buildSystemPrompt(setting,personality,playerArr),messages:history.map(m=>({role:m.role,content:m.content}))})});
    if(!res.ok){const e=await res.json();throw new Error(e.error?.message||"Error "+res.status);}
    const data=await res.json();
    return data.content?.[0]?.text||"The DM ponders...";
  };

  const generateImage = async(prompt)=>{
    setImageLoading(true);
    try {
      const res=await fetch("/api/image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:"Fantasy D&D scene, dramatic painterly illustration, cinematic lighting: "+prompt})});
      if(res.ok){const d=await res.json();setImageLoading(false);return d.url;}
    } catch {}
    setImageLoading(false);return null;
  };

  const processDMReply = async(reply,prevChars,prevQuests,prevInit,prevTurn)=>{
    const sheetUpdates=parseAllSheets(reply);
    const newChars={...prevChars,...sheetUpdates};
    const questUpdate=parseTag(reply,"QUEST_UPDATE");
    const newQuests=questUpdate?[...prevQuests,...questUpdate.filter(q=>!prevQuests.find(eq=>eq.id===q.id))]:prevQuests;
    const initUpdate=parseTag(reply,"INITIATIVE");
    const newInit=initUpdate||prevInit;
    const turnUpdate=parseTag(reply,"TURN");
    const newTurn=turnUpdate||prevTurn;
    const imagePrompt=parseTag(reply,"SCENE_IMAGE");
    let newImage=sceneImage;
    if(imagePrompt){const url=await generateImage(imagePrompt);if(url){setSceneImage(url);newImage=url;}}
    if(Object.keys(sheetUpdates).length) setCharacters(newChars);
    if(questUpdate) setQuests(newQuests);
    if(initUpdate) setInitiative(newInit);
    if(turnUpdate) setCurrentTurn(newTurn);
    return {newChars,newQuests,newImage,newInit,newTurn};
  };

  const launch = async(currentPlayers)=>{
    setLoading(true);
    try {
      const reply=await askClaude([{role:"user",content:"Begin! Welcome the party by name, reference their classes and backstories, then launch into an exciting opening scene."}],currentPlayers);
      const msg={role:"assistant",content:reply,id:Date.now(),player:"DM"};
      setMessages([msg]);
      const {newChars,newQuests,newImage,newInit,newTurn}=await processDMReply(reply,{},quests,initiative,currentTurn);
      await persist([msg],newChars,newQuests,newImage,newInit,newTurn,currentPlayers);
      speak(reply);
    } catch(e){setMessages([{role:"assistant",content:"Error: "+e.message,id:Date.now()}]);}
    setLoading(false);
  };

  const send = async(text)=>{
    if(!text.trim()||loading||!isHost) return;
    const userMsg={role:"user",content:text,id:Date.now(),player:playerName};
    const history=[...messages,userMsg];
    setMessages(history);setInput("");setLoading(true);stopAudio();
    try {
      const reply=await askClaude(history);
      const dmMsg={role:"assistant",content:reply,id:Date.now()+1,player:"DM"};
      const newMsgs=[...history,dmMsg];
      setMessages(newMsgs);
      const {newChars,newQuests,newImage,newInit,newTurn}=await processDMReply(reply,characters,quests,initiative,currentTurn);
      await persist(newMsgs,newChars,newQuests,newImage,newInit,newTurn,players);
      speak(reply);
    } catch(e){setMessages(p=>[...p,{role:"assistant",content:"Error: "+e.message,id:Date.now()+1}]);}
    setLoading(false);
  };

  const handleDiceRoll=({die,roll,modifier,total,isCrit,isFail})=>{
    setShowDice(false);
    let msg=playerName+" rolled d"+die+": "+roll;
    if(modifier!==0) msg+=(modifier>=0?" +":" ")+modifier+" = "+total;
    if(isCrit) msg+=" NATURAL 20! CRITICAL HIT!";
    if(isFail) msg+=" NATURAL 1! CRITICAL FAIL!";
    send(msg);
  };

  const myChar={...(characters[playerName]||{}), portrait:character?.portrait, playerName};
  const lastDM=[...messages].reverse().find(m=>m.role==="assistant");
  const activeQuests=quests.filter(q=>q.status==="active");
  const playerList=Object.values(players);

  return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 20% 0%,#1a0a2e 0%,#0d0d1a 40%,#000508 100%)",fontFamily:"'Palatino Linotype','Book Antiqua',Georgia,serif",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden",color:"#e8d5a3"}}>
      {particles.map(p=>(
        <div key={p.id} style={{position:"fixed",left:p.x+"%",top:p.y+"%",width:p.size+"px",height:p.size+"px",background:"radial-gradient(circle,#f4c842,#c97b2a)",borderRadius:"50%",opacity:.28,pointerEvents:"none",zIndex:0,boxShadow:"0 0 5px #f4c842",animation:"fp "+p.dur+"s "+p.delay+"s ease-in-out infinite alternate"}} />
      ))}

      <style>{`
        @keyframes fp{from{transform:translateY(0) scale(1);opacity:.18}to{transform:translateY(-24px) scale(1.2);opacity:.46}}
        @keyframes glow{0%,100%{box-shadow:0 0 12px rgba(212,170,60,.25)}50%{box-shadow:0 0 28px rgba(212,170,60,.6)}}
        @keyframes lpulse{0%,100%{box-shadow:0 0 0 0 rgba(220,80,80,.6)}50%{box-shadow:0 0 0 9px rgba(220,80,80,0)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(11px)}to{opacity:1;transform:translateY(0)}}
        @keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes imgfade{from{opacity:0}to{opacity:1}}
        @keyframes turnpulse{0%,100%{box-shadow:0 0 0 0 rgba(100,255,100,.5)}50%{box-shadow:0 0 0 8px rgba(100,255,100,0)}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d0d1a}::-webkit-scrollbar-thumb{background:#4a3520;border-radius:3px}
        textarea:focus{outline:none;box-shadow:0 0 0 1px rgba(200,148,58,.3)}
        .qb:hover{background:rgba(212,170,60,.16)!important}
        .cb:hover{opacity:.75}
      `}</style>

      <header style={{position:"relative",zIndex:10,textAlign:"center",padding:"12px 16px 8px",borderBottom:"1px solid rgba(212,170,60,.15)",background:"rgba(0,0,0,.6)",backdropFilter:"blur(12px)"}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"clamp(14px,3vw,24px)",fontWeight:700,background:"linear-gradient(135deg,#f4c842 0%,#e8a020 40%,#f4c842 80%)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 4s linear infinite",letterSpacing:"3px"}}>⚔️ THE DUNGEON MASTER ⚔️</div>
        <div style={{fontSize:"9px",color:"#3a2015",letterSpacing:"2px",fontFamily:"'Cinzel',serif",marginTop:"2px"}}>{setting.toUpperCase()} · CODE: <span style={{color:"#6a4020"}}>{sessionId}</span></div>
      </header>

      {(sceneImage||imageLoading) && (
        <div style={{position:"relative",zIndex:5,maxWidth:"880px",width:"100%",margin:"0 auto",padding:"10px 16px 0"}}>
          {imageLoading
            ? <div style={{width:"100%",height:"140px",background:"rgba(20,10,5,.6)",borderRadius:"10px",border:"1px solid rgba(200,148,58,.18)",display:"flex",alignItems:"center",justifyContent:"center",color:"#4a3020",fontFamily:"'Cinzel',serif",fontSize:"11px",letterSpacing:"2px"}}>🖼️ PAINTING THE SCENE...</div>
            : <img src={sceneImage} alt="Scene" style={{width:"100%",maxHeight:"200px",objectFit:"cover",borderRadius:"10px",border:"1px solid rgba(200,148,58,.22)",animation:"imgfade .8s ease",boxShadow:"0 4px 20px rgba(0,0,0,.7)"}} />
          }
        </div>
      )}

      <main style={{flex:1,overflowY:"auto",padding:"14px 16px",position:"relative",zIndex:5,maxWidth:"880px",width:"100%",margin:"0 auto"}}>
        {messages.map((msg,i)=>(
          <div key={msg.id||i} style={{animation:"fadeUp .35s ease forwards",marginBottom:"16px",display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
            {msg.role==="assistant" && (
              <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,background:"radial-gradient(circle,#4a2a0a,#1a0a00)",border:"2px solid #c8943a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,marginRight:8,marginTop:3,boxShadow:"0 0 10px rgba(200,148,58,.32)",animation:"breathe 4s ease-in-out infinite"}}>🐉</div>
            )}
            <div style={{maxWidth:"82%",background:msg.role==="assistant"?"linear-gradient(135deg,rgba(22,10,2,.97),rgba(12,6,22,.97))":"linear-gradient(135deg,rgba(32,16,4,.93),rgba(42,22,2,.93))",border:"1px solid "+(msg.role==="assistant"?"rgba(200,148,58,.3)":"rgba(180,130,40,.2)"),borderRadius:msg.role==="assistant"?"4px 14px 14px 14px":"14px 4px 14px 14px",padding:"11px 15px",lineHeight:1.78,fontSize:"15px",color:msg.role==="assistant"?"#e8d5a3":"#f0e0b0",boxShadow:"0 3px 14px rgba(0,0,0,.4)",fontFamily:"'Crimson Text',Georgia,serif"}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"9px",letterSpacing:"2px",color:msg.role==="assistant"?"#c8943a":"#b09040",marginBottom:5,textAlign:msg.role==="user"?"right":"left"}}>{msg.role==="assistant"?"Dungeon Master":(msg.player||playerName)}</div>
              <div dangerouslySetInnerHTML={{__html:fmt(msg.content)}} />
            </div>
            {msg.role==="user" && (
              <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,border:"2px solid #a07830",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,marginLeft:8,marginTop:3,overflow:"hidden",background:myChar?.portrait?"none":"radial-gradient(circle,#2a1a00,#100800)"}}>
                {myChar?.portrait?<img src={myChar.portrait} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"⚔️"}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:"radial-gradient(circle,#4a2a0a,#1a0a00)",border:"2px solid #c8943a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,animation:"glow 1.4s infinite"}}>🐉</div>
            <div style={{background:"rgba(22,10,2,.95)",border:"1px solid rgba(200,148,58,.25)",borderRadius:"4px 14px 14px 14px",padding:"11px 16px",display:"flex",gap:5,alignItems:"center"}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#c8943a",opacity:.7,animation:"bounce .9s "+(i*0.18)+"s ease-in-out infinite"}}/>)}
              <span style={{color:"#6a4020",fontSize:11,marginLeft:6,fontFamily:"'Cinzel',serif"}}>Consulting the ancient tomes...</span>
            </div>
          </div>
        )}
        {!isHost && messages.length>0 && <div style={{textAlign:"center",color:"#4a3020",fontSize:"13px",fontFamily:"'Crimson Text',serif",marginTop:"16px",fontStyle:"italic"}}>Watching as {playerName} — host controls the session</div>}
        <div ref={bottomRef}/>
      </main>

      {/* Player bar */}
      <div style={{position:"relative",zIndex:10,background:"rgba(0,0,0,.65)",backdropFilter:"blur(10px)",borderTop:"1px solid rgba(212,170,60,.1)",padding:"8px 16px",maxWidth:"880px",width:"100%",margin:"0 auto"}}>
        <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"2px"}}>
          <PlayerCard p={myChar} isMe={true} isTurn={currentTurn===playerName} initiative={initiative} onClick={()=>setShowSheet(true)}/>
          {playerList.filter(p=>p.playerName!==playerName).map(p=>(
            <PlayerCard key={p.playerName} p={{...(characters[p.playerName]||p),portrait:p.portrait}} isMe={false} isTurn={currentTurn===p.playerName} initiative={initiative}/>
          ))}
          {Array.from({length:Math.max(0,6-playerList.length)}).map((_,i)=>(
            <div key={"e"+i} style={{width:"70px",flexShrink:0,height:"70px",borderRadius:"10px",background:"rgba(20,10,5,.3)",border:"1px dashed rgba(200,148,58,.08)",display:"flex",alignItems:"center",justifyContent:"center",color:"#2a1a08",fontFamily:"'Cinzel',serif",fontSize:"18px"}}>+</div>
          ))}
        </div>
      </div>

      {/* Quests panel */}
      {showQuests && activeQuests.length>0 && (
        <div style={{position:"relative",zIndex:10,maxWidth:"880px",width:"100%",margin:"0 auto",padding:"0 16px 6px"}}>
          <div style={{background:"rgba(16,8,3,.9)",border:"1px solid rgba(200,148,58,.18)",borderRadius:"8px",padding:"10px 14px"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"10px",color:"#7a5820",letterSpacing:"2px",marginBottom:"8px"}}>🏆 ACTIVE QUESTS</div>
            {activeQuests.map(q=>(
              <div key={q.id} style={{padding:"6px 8px",marginBottom:"4px",background:"rgba(0,0,0,.3)",borderRadius:"5px",border:"1px solid rgba(200,148,58,.1)"}}>
                <div style={{color:"#c8a040",fontFamily:"'Cinzel',serif",fontSize:"11px"}}>{q.title}</div>
                <div style={{color:"#7a6040",fontSize:"12px",marginTop:"2px",fontFamily:"'Crimson Text',serif"}}>{q.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick chips */}
      {isHost && (
        <div style={{position:"relative",zIndex:10,maxWidth:"880px",width:"100%",margin:"0 auto",padding:"0 16px 5px",display:"flex",gap:5,flexWrap:"wrap"}}>
          {QUICK.map(q=>(
            <button key={q} className="qb" onClick={()=>send(q)} style={{background:"rgba(212,170,60,.06)",border:"1px solid rgba(212,170,60,.13)",color:"#705828",borderRadius:12,padding:"3px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Crimson Text',Georgia,serif",transition:"all .15s",whiteSpace:"nowrap"}}>{q}</button>
          ))}
        </div>
      )}

      {/* Footer input */}
      <footer style={{position:"relative",zIndex:10,background:"rgba(0,0,0,.75)",backdropFilter:"blur(14px)",borderTop:"1px solid rgba(212,170,60,.1)",padding:"10px 14px"}}>
        {isHost ? (
          <div style={{maxWidth:"880px",margin:"0 auto"}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <button onClick={startListening} style={{width:42,height:42,borderRadius:"50%",flexShrink:0,background:listening?"radial-gradient(circle,#8b0000,#4a0000)":"radial-gradient(circle,#2a1500,#100a00)",border:"2px solid "+(listening?"#ff4040":"#6a4010"),color:listening?"#ff8080":"#c8943a",fontSize:15,cursor:"pointer",animation:listening?"lpulse 1s infinite":"none",display:"flex",alignItems:"center",justifyContent:"center"}}>{listening?"🔴":"🎤"}</button>
              <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}} placeholder={listening?"🎤 Listening...":"Type your action... (Enter to send)"} rows={2} style={{flex:1,background:"rgba(12,6,2,.93)",border:"1px solid rgba(200,148,58,.2)",borderRadius:8,padding:"9px 13px",color:"#e8d5a3",fontSize:14,resize:"none",fontFamily:"'Crimson Text',Georgia,serif",lineHeight:1.5}}/>
              <button onClick={()=>setShowDice(true)} style={{width:42,height:42,borderRadius:"50%",flexShrink:0,background:"radial-gradient(circle,#18082a,#080414)",border:"2px solid #6a4a9a",color:"#b080ef",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>🎲</button>
              <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{width:42,height:42,borderRadius:"50%",flexShrink:0,background:(loading||!input.trim())?"radial-gradient(circle,#111,#080808)":"radial-gradient(circle,#5a3a00,#2a1800)",border:"2px solid "+((loading||!input.trim())?"#181818":"#d4aa3c"),color:(loading||!input.trim())?"#202020":"#f4c842",fontSize:17,cursor:(loading||!input.trim())?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",animation:(!loading&&input.trim())?"glow 2s infinite":"none"}}>⚡</button>
            </div>
            <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center",flexWrap:"wrap"}}>
              <button className="cb" onClick={()=>setVoiceOn(v=>!v)} style={ctrlBtn(voiceOn)}>{voiceOn?"🔊 Voice":"🔇 Voice"}</button>
              {speaking&&<button className="cb" onClick={stopAudio} style={ctrlBtn(false,"#c84040","#ff8080")}>⏹ Stop</button>}
              {!speaking&&lastDM&&<button className="cb" onClick={()=>speak(lastDM.content)} style={ctrlBtn(false,"#4a7a5a","#70c080")}>🔁 Replay</button>}
              <button className="cb" onClick={()=>setShowQuests(v=>!v)} style={ctrlBtn(showQuests)}>🏆 Quests{activeQuests.length?" ("+activeQuests.length+")":""}</button>
              <div style={{flex:1}}/>
              {speaking&&<span style={{color:"#70c080",fontSize:10,fontFamily:"'Cinzel',serif"}}>🔊 SPEAKING...</span>}
              <button className="cb" onClick={onLeave} style={{...ctrlBtn(false),color:"#3a2010"}}>✕ Leave</button>
            </div>
          </div>
        ):(
          <div style={{maxWidth:"880px",margin:"0 auto",display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{color:"#4a3020",fontFamily:"'Crimson Text',serif",fontSize:"13px",fontStyle:"italic",flex:1}}>👁️ Watching as {playerName}</div>
            <button className="cb" onClick={()=>setVoiceOn(v=>!v)} style={ctrlBtn(voiceOn)}>{voiceOn?"🔊 Voice":"🔇 Voice"}</button>
            {speaking&&<button className="cb" onClick={stopAudio} style={ctrlBtn(false,"#c84040","#ff8080")}>⏹ Stop</button>}
            {!speaking&&lastDM&&<button className="cb" onClick={()=>speak(lastDM.content)} style={ctrlBtn(false,"#4a7a5a","#70c080")}>🔁 Replay</button>}
            <button className="cb" onClick={onLeave} style={{...ctrlBtn(false),color:"#3a2010"}}>✕ Leave</button>
          </div>
        )}
      </footer>

      {showDice&&<DiceRoller onRoll={handleDiceRoll} onClose={()=>setShowDice(false)}/>}
      {showSheet&&<CharacterSheet character={myChar} playerName={playerName} onClose={()=>setShowSheet(false)}/>}
    </div>
  );
}
