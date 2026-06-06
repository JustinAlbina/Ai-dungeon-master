import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import CharacterSheet from "./CharacterSheet";
import MapView from "./MapView";

function buildSystemPrompt(setting, personality, players, playerCount) {
  const settingDesc={
    "High Fantasy":"classic heroic fantasy world with kingdoms, dragons, elves, and epic quests",
    "Dark Fantasy":"grim morally grey world of corruption, monsters, and hard choices",
    "Pirates & Seas":"swashbuckling world of ocean adventures, sea monsters, and pirate treasure",
    "Sci-Fi D&D":"futuristic world blending magic and technology, space travel and ancient ruins",
    "Horror":"terrifying world of dread, eldritch horrors, and survival against darkness",
  }[setting]||"classic fantasy world";
  const personalityDesc={
    "Epic & Dramatic":"You speak with gravitas and drama. Every moment feels legendary.",
    "Funny & Casual":"You are witty and fun, cracking jokes while telling a great story.",
    "Gritty & Serious":"You are serious and immersive. The world feels real and consequential.",
    "Mysterious & Eerie":"You speak in evocative mysterious tones. Everything feels unsettling.",
  }[personality]||"You are dramatic and engaging.";
  const playerList=players.map(p=>p.playerName+" playing "+(p.name||p.playerName)+" the "+(p.race||"")+" "+(p.cls||"")+" — backstory: "+(p.backstory||"adventurer")).join("; ");
  return `You are an expert Dungeons & Dragons Dungeon Master running a ${settingDesc} campaign for ${playerCount} complete beginners. ${personalityDesc}

Players: ${playerList||"unknown"}

CORE RULES:
1. Teach rules naturally as you go — never dump rules at once
2. Run everything — combat, NPCs, world events
3. Track HP, stats, inventory for ALL characters precisely
4. Be forgiving and encouraging — beginners make mistakes
5. Use every player's character name and reference their backstories constantly

DICE ROLL RULES — CRITICAL:
When a player action requires a dice roll, you MUST:
1. Narrate the action and its dramatic setup — build the tension
2. End your message with ONLY this tag on its own line (nothing after it):
   <ROLL_REQUEST>{"die":"d20","skill":"Stealth","ability":"DEX","flavor":"The shadows hold their breath as you slip past the guard."}</ROLL_REQUEST>
3. STOP there. Do NOT narrate the outcome. Do NOT roll for the player. Do NOT include [Rolled X] in your text.
4. Wait. The player will roll and their result will arrive as: [ROLL_RESULT: 17 (14 + 3 DEX)]
5. When you receive a [ROLL_RESULT], react to that exact number and continue the story.

Valid die values: d4, d6, d8, d10, d12, d20, d100
Valid ability values: STR, DEX, CON, INT, WIS, CHA
DC guidelines: Easy DC 10, Medium DC 15, Hard DC 20, Very Hard DC 25

NEVER self-roll. NEVER write [Rolled X + Y = Z]. The player rolls — you react.

OPENING: Welcome all players by name, reference their specific backstories and classes, paint a vivid opening scene. ALWAYS include a <SCENE_IMAGE> tag on your FIRST response — this is mandatory.

WHEN SCENE CHANGES: Any time players move to a new location or the environment changes significantly, include a new <SCENE_IMAGE> tag.

OUTPUT THESE TAGS AT THE END OF YOUR RESPONSE (when relevant):

Character sheet — output for EVERY player when you assign their stats at start, and whenever stats change:
<SHEET_UPDATE>{"playerName":"Justin","character":{"name":"Oma","cls":"Paladin","race":"Drow","level":1,"hp":12,"maxHp":12,"ac":18,"stats":{"STR":16,"DEX":10,"CON":14,"INT":10,"WIS":12,"CHA":14},"abilities":[{"name":"Divine Sense","desc":"Detect celestial/fiend/undead within 60ft. Uses: 4/day"},{"name":"Lay on Hands","desc":"Heal up to 5 HP total per day by touch"}],"inventory":["Longsword","Shield","Chain Mail","Holy Symbol","5 GP"],"spells":[]}}</SHEET_UPDATE>

Scene image — REQUIRED on first response, and on any location/scene change:
<SCENE_IMAGE>vivid 1-2 sentence visual description of exactly what the players see right now</SCENE_IMAGE>

Quests — when discovered or completed:
<QUEST_UPDATE>[{"id":"q1","title":"Quest Name","desc":"Brief description","status":"active"}]</QUEST_UPDATE>

Combat initiative order:
<INITIATIVE>["Player1","Player2","EnemyA"]</INITIATIVE>

Current turn in combat:
<TURN>PlayerName</TURN>

FORMATTING: **bold** for key terms and names. *italics* for atmosphere and NPC speech. # for chapter/section headers. NO markdown tables. NO pipe characters.`;
}

const TAGS=["SHEET_UPDATE","SCENE_IMAGE","QUEST_UPDATE","INITIATIVE","TURN","ROLL_REQUEST"];
function stripTags(text){let t=text;TAGS.forEach(tag=>{t=t.replace(new RegExp("<"+tag+">[\\s\\S]*?</"+tag+">","g"),"");});return t.trim();}

function fmt(text){
  return stripTags(text)
    .replace(/^# (.+)$/gm,"<h2 style='font-family:Cinzel,serif;color:#f4c842;font-size:18px;letter-spacing:2px;margin:14px 0 8px'>$1</h2>")
    .replace(/^## (.+)$/gm,"<h3 style='font-family:Cinzel,serif;color:#d4aa3c;font-size:15px;letter-spacing:1px;margin:10px 0 5px'>$1</h3>")
    .replace(/^---+$/gm,"<hr style='border:none;border-top:1px solid rgba(200,148,58,.18);margin:10px 0'/>")
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.*?)\*/g,"<em>$1</em>")
    .replace(/\n/g,"<br/>");
}

function cleanSpeech(text){
  return stripTags(text)
    .replace(/^#{1,3} /gm,"").replace(/^---+$/gm,"")
    .replace(/\*\*(.*?)\*\*/g,"$1").replace(/\*(.*?)\*/g,"$1")
    .replace(/[🎲📜⚔️🏰🐉⚡🎭🔮🗡️🏹🛡️🌿💀⚓]/gu,"")
    .replace(/\[.*?\]/g,"").replace(/\|/g," ")
    .replace(/\s+/g," ").trim();
}

function parseTag(text,tag){
  const m=text.match(new RegExp("<"+tag+">([\\s\\S]*?)</"+tag+">"));
  if(!m)return null;
  if(tag==="SCENE_IMAGE"||tag==="TURN")return m[1].trim();
  try{return JSON.parse(m[1].trim());}catch{return null;}
}

function parseAllSheets(text){
  const regex=/<SHEET_UPDATE>([\s\S]*?)<\/SHEET_UPDATE>/g;
  const updates={};let m;
  while((m=regex.exec(text))!==null){try{const d=JSON.parse(m[1].trim());if(d.playerName)updates[d.playerName]=d.character;}catch{}}
  return updates;
}

function parseRollRequest(text){
  const m=text.match(/<ROLL_REQUEST>([\s\S]*?)<\/ROLL_REQUEST>/);
  if(!m)return null;
  try{return JSON.parse(m[1].trim());}catch{return null;}
}

function chunkText(text){
  const sentences=text.match(/[^.!?]+[.!?]+[\s]*/g)||[text];
  const chunks=[];let cur="";
  for(const s of sentences){
    if((cur+s).length>700&&cur.length>150){chunks.push(cur.trim());cur=s;}
    else cur+=s;
  }
  if(cur.trim())chunks.push(cur.trim());
  return chunks.length?chunks:[text];
}

function rollDie(sides){return Math.floor(Math.random()*sides)+1;}

function classEmoji(cls){const map={Fighter:"⚔️",Wizard:"🔮",Rogue:"🗡️",Cleric:"✨",Ranger:"🏹",Paladin:"🛡️",Bard:"🎭",Druid:"🌿",Barbarian:"💢",Monk:"👊",Sorcerer:"⚡",Warlock:"👁️"};return map[cls]||"⚔️";}
function ctrlBtn(active,bc,c){return{background:active?"rgba(212,170,60,.12)":"rgba(24,12,3,.6)",border:"1px solid "+(bc||(active?"#c8943a":"rgba(200,148,58,.15)")),color:c||(active?"#f4c842":"#6a4020"),borderRadius:"16px",padding:"4px 11px",fontSize:"11px",cursor:"pointer",fontFamily:"'Cinzel',serif",letterSpacing:"1px",transition:"all .2s"};}

function PlayerCard({p,isMe,isTurn,initiative,onClick}){
  const initPos=initiative.indexOf(p.playerName);
  const hpPct=p.hp!==undefined&&p.maxHp?Math.max(0,Math.min(100,(p.hp/p.maxHp)*100)):null;
  return(
    <div onClick={onClick} style={{width:"72px",flexShrink:0,borderRadius:"10px",cursor:onClick?"pointer":"default",background:isTurn?"linear-gradient(135deg,rgba(20,60,20,.9),rgba(10,40,10,.9))":isMe?"linear-gradient(135deg,rgba(40,20,5,.9),rgba(25,10,3,.9))":"linear-gradient(135deg,rgba(20,10,5,.7),rgba(12,6,3,.7))",border:"1px solid "+(isTurn?"#40c040":isMe?"#c8943a":"rgba(200,148,58,.12)"),padding:"6px",textAlign:"center",animation:isTurn?"turnpulse 1.5s infinite":"none",transition:"all .2s"}}>
      <div style={{width:"48px",height:"48px",borderRadius:"8px",margin:"0 auto 4px",overflow:"hidden",background:"rgba(0,0,0,.4)",border:"1px solid rgba(200,148,58,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px"}}>
        {p.portrait?<img src={p.portrait} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>:classEmoji(p.cls)}
      </div>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"8px",color:isTurn?"#80ff80":isMe?"#c8943a":"#7a5030",letterSpacing:"0.5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name||p.playerName||"?"}</div>
      {hpPct!==null&&<div style={{height:"3px",background:"rgba(0,0,0,.4)",borderRadius:"2px",marginTop:"3px",overflow:"hidden"}}><div style={{height:"100%",borderRadius:"2px",transition:"width .3s",width:hpPct+"%",background:hpPct<30?"#ff4040":hpPct<60?"#ffaa00":"#40c040"}}/></div>}
      {initPos>=0&&<div style={{fontSize:"8px",color:"#8a6030",marginTop:"2px",fontFamily:"'Cinzel',serif"}}>#{initPos+1}</div>}
      {isTurn&&<div style={{fontSize:"7px",color:"#80ff80",fontFamily:"'Cinzel',serif",marginTop:"1px"}}>YOUR TURN</div>}
    </div>
  );
}

// ─── Animated Dice Roller ───────────────────────────────────────────────────
const DICE_SIDES=[4,6,8,10,12,20,100];

function DiceRollerInline({onRoll,onClose,lockedDie,lockedModifier,lockedLabel,freeRoll}){
  const[selected,setSelected]=useState(lockedDie||20);
  const[modifier,setModifier]=useState(lockedModifier||0);
  const[rolling,setRolling]=useState(false);
  const[result,setResult]=useState(null);
  const[display,setDisplay]=useState(null);
  const[countdown,setCountdown]=useState(null); // seconds remaining before auto-send

  const roll=()=>{
    if(rolling||result!==null)return;
    setRolling(true);
    let count=0;
    const interval=setInterval(()=>{
      setDisplay(rollDie(selected));
      count++;
      if(count>14){
        clearInterval(interval);
        const final=rollDie(selected);
        setDisplay(final);setResult(final);setRolling(false);

        const total=final+Number(modifier);
        const isCrit=selected===20&&final===20;
        const isFail=selected===20&&final===1;

        // Show result for 2 seconds before sending
        setCountdown(2);
        let secs=2;
        const cd=setInterval(()=>{
          secs-=1;
          setCountdown(secs);
          if(secs<=0){
            clearInterval(cd);
            setCountdown(null);
            onRoll({die:selected,roll:final,modifier:Number(modifier),total,isCrit,isFail});
          }
        },1000);
      }
    },55);
  };

  const total=result!==null?result+Number(modifier):null;
  const isCrit=selected===20&&result===20;
  const isFail=selected===20&&result===1;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(6px)"}}>
      <div style={{background:"linear-gradient(135deg,rgba(28,13,4,.99),rgba(14,7,22,.99))",border:"1px solid rgba(212,170,60,.5)",borderRadius:"20px",padding:"28px",width:"320px",textAlign:"center",boxShadow:"0 0 60px rgba(0,0,0,.9),0 0 30px rgba(100,60,0,.3)"}}>

        <div style={{fontFamily:"'Cinzel',serif",color:"#f4c842",fontSize:"13px",letterSpacing:"3px",marginBottom:"6px"}}>
          {freeRoll?"🎲 FREE ROLL":"🎲 ROLL REQUIRED"}
        </div>
        {lockedLabel&&<div style={{fontStyle:"italic",color:"#c9a96e",fontSize:"13px",fontFamily:"'Crimson Text',serif",marginBottom:"14px"}}>"{lockedLabel}"</div>}

        {freeRoll&&(
          <div style={{display:"flex",gap:"6px",justifyContent:"center",flexWrap:"wrap",marginBottom:"16px"}}>
            {DICE_SIDES.map(d=>(
              <button key={d} onClick={()=>{if(!rolling&&result===null){setSelected(d);}}} style={{width:"40px",height:"40px",borderRadius:"8px",background:selected===d?"linear-gradient(135deg,#5a3a00,#3a2000)":"rgba(20,10,5,.8)",border:"1px solid "+(selected===d?"#c8943a":"rgba(200,148,58,.2)"),color:selected===d?"#f4c842":"#8a6040",fontFamily:"'Cinzel',serif",fontSize:"10px",cursor:"pointer",transition:"all .15s"}}>d{d}</button>
            ))}
          </div>
        )}
        {!freeRoll&&(
          <div style={{marginBottom:"14px",color:"#e8d5a3",fontFamily:"'Crimson Text',serif",fontSize:"14px"}}>
            Roll a <strong style={{color:"#f4c842"}}>d{selected}</strong>
            {modifier!==0&&<span style={{color:"#c8943a"}}> ({modifier>=0?"+":""}{modifier} modifier)</span>}
          </div>
        )}

        {/* Animated die face */}
        <div style={{width:"110px",height:"110px",margin:"0 auto 16px",background:rolling?"radial-gradient(circle,#5a3a00,#2a1500)":(isCrit?"radial-gradient(circle,#1a4a1a,#0a2a0a)":isFail?"radial-gradient(circle,#4a1a1a,#2a0a0a)":"radial-gradient(circle,#3a2500,#1a1000)"),border:"2px solid "+(isCrit?"#60ff60":isFail?"#ff6060":"#c8943a"),borderRadius:"14px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:display!==null?"50px":"24px",color:isCrit?"#60ff60":isFail?"#ff6060":"#f4c842",fontFamily:"'Cinzel',serif",fontWeight:700,boxShadow:rolling?"0 0 30px rgba(200,148,58,.7)":(isCrit?"0 0 30px rgba(60,255,60,.5)":isFail?"0 0 30px rgba(255,60,60,.5)":"none"),transition:"background .15s,box-shadow .15s",animation:rolling?"dicespin .15s linear infinite":"none"}}>
          {display!==null?display:"d"+selected}
        </div>

        {/* Result + countdown */}
        {result!==null&&(
          <div style={{marginBottom:"12px"}}>
            {isCrit&&<div style={{color:"#60ff60",fontFamily:"'Cinzel',serif",fontSize:"12px",letterSpacing:"2px",marginBottom:"4px"}}>⚡ NATURAL 20! CRITICAL HIT!</div>}
            {isFail&&<div style={{color:"#ff6060",fontFamily:"'Cinzel',serif",fontSize:"12px",letterSpacing:"2px",marginBottom:"4px"}}>💀 NATURAL 1! CRITICAL FAIL!</div>}
            {modifier!==0&&(
              <div style={{color:"#c8a060",fontSize:"16px",fontFamily:"'Crimson Text',serif"}}>
                {result} {modifier>=0?"+":""}{modifier} = <strong style={{color:"#f4c842",fontSize:"22px"}}>{total}</strong>
              </div>
            )}
            {modifier===0&&<div style={{color:"#f4c842",fontSize:"28px",fontFamily:"'Cinzel',serif",fontWeight:700}}>{result}</div>}
            {countdown!==null&&(
              <div style={{color:"#6a4820",fontFamily:"'Cinzel',serif",fontSize:"10px",letterSpacing:"2px",marginTop:"8px"}}>
                SENDING IN {countdown}...
              </div>
            )}
          </div>
        )}

        {freeRoll&&(
          <div style={{display:"flex",alignItems:"center",gap:"8px",justifyContent:"center",marginBottom:"16px"}}>
            <span style={{color:"#8a6040",fontFamily:"'Cinzel',serif",fontSize:"10px",letterSpacing:"1px"}}>MODIFIER</span>
            <button onClick={()=>{if(!rolling&&result===null)setModifier(m=>m-1);}} style={{width:"26px",height:"26px",borderRadius:"6px",background:"rgba(20,10,5,.8)",border:"1px solid rgba(200,148,58,.2)",color:"#c8943a",cursor:"pointer",fontSize:"16px"}}>−</button>
            <span style={{color:"#f4c842",fontFamily:"'Cinzel',serif",fontSize:"15px",minWidth:"28px",textAlign:"center"}}>{modifier>=0?"+":""}{modifier}</span>
            <button onClick={()=>{if(!rolling&&result===null)setModifier(m=>m+1);}} style={{width:"26px",height:"26px",borderRadius:"6px",background:"rgba(20,10,5,.8)",border:"1px solid rgba(200,148,58,.2)",color:"#c8943a",cursor:"pointer",fontSize:"16px"}}>+</button>
          </div>
        )}

        <style>{`@keyframes dicespin{0%{transform:rotate(0deg) scale(1)}25%{transform:rotate(8deg) scale(1.05)}75%{transform:rotate(-8deg) scale(1.05)}100%{transform:rotate(0deg) scale(1)}}`}</style>

        {result===null&&(
          <button onClick={roll} disabled={rolling} style={{width:"100%",padding:"11px",background:rolling?"rgba(30,15,5,.8)":"linear-gradient(135deg,#5a3a00,#3a2000)",border:"1px solid "+(rolling?"#4a3020":"#c8943a"),borderRadius:"8px",color:rolling?"#6a5030":"#f4c842",fontFamily:"'Cinzel',serif",fontSize:"13px",letterSpacing:"2px",cursor:rolling?"not-allowed":"pointer",marginBottom:"8px",transition:"all .2s"}}>
            {rolling?"🎲 ROLLING...":"🎲 ROLL d"+selected}
          </button>
        )}

        {freeRoll&&result===null&&(
          <button onClick={onClose} style={{width:"100%",padding:"8px",background:"transparent",border:"1px solid rgba(200,148,58,.15)",borderRadius:"8px",color:"#5a4030",fontFamily:"'Cinzel',serif",fontSize:"10px",letterSpacing:"1px",cursor:"pointer"}}>CLOSE</button>
        )}
      </div>
    </div>
  );
}

const QUICK=["What are my options?","What's my HP?","I look around carefully","I talk to the NPC","I attack!","Explain that rule","Recap the story so far"];

export default function Game({session,character,onLeave}){
  const{sessionId,playerName,isHost,setting,personality,playerCount}=session;
  const[messages,setMessages]=useState([]);
  const[input,setInput]=useState("");
  const[loading,setLoading]=useState(false);
  const[speaking,setSpeaking]=useState(false);
  const[listening,setListening]=useState(false);
  const[voiceOn,setVoiceOn]=useState(true);
  const[showFreeRoll,setShowFreeRoll]=useState(false);
  const[showSheet,setShowSheet]=useState(false);
  const[showMap,setShowMap]=useState(false);
  const[lightbox,setLightbox]=useState(null); // eslint-disable-line
  const[showQuests,setShowQuests]=useState(false);
  const[characters,setCharacters]=useState({});
  const[quests,setQuests]=useState([]);
  const[sceneImage,setSceneImage]=useState(null);
  const[imageLoading,setImageLoading]=useState(false);
  const[initiative,setInitiative]=useState([]);
  const[currentTurn,setCurrentTurn]=useState(null);
  const[players,setPlayers]=useState({});
  const[initialized,setInitialized]=useState(false);
  const[started,setStarted]=useState(false);
  const[pendingRoll,setPendingRoll]=useState(null);

  const bottomRef=useRef(null);
  const audioRef=useRef(null);
  const stopRef=useRef(false);
  const synthRef=useRef(window.speechSynthesis);
  const kaRef=useRef(null);

  const[particles]=useState(()=>Array.from({length:14},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,size:Math.random()*3+1,dur:Math.random()*12+8,delay:Math.random()*6})));

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  useEffect(()=>{
    const init=async()=>{
      const{data}=await supabase.from("sessions").select("*").eq("code",sessionId).single();
      if(data){
        const newPlayers={...(data.players||{}),[playerName]:{
          ...character,playerName,portrait:character?.portrait||null,
          stats:character?.stats||{},abilities:character?.abilities||[],
          spells:character?.spells||[],inventory:character?.inventory||[],
          hp:character?.hp||null,maxHp:character?.maxHp||null,ac:character?.ac||null,
        }};
        await supabase.from("sessions").update({players:newPlayers}).eq("code",sessionId);
        setMessages(data.messages||[]);setCharacters(data.characters||{});
        setQuests(data.quests||[]);setSceneImage(data.scene_image||null);
        setInitiative(data.initiative||[]);setCurrentTurn(data.current_turn||null);
        setPlayers(newPlayers);setStarted(data.started||false);
      }
    };
    init();
    const channel=supabase.channel("game:"+sessionId)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"sessions",filter:"code=eq."+sessionId},(payload)=>{
        const d=payload.new;
        setMessages(d.messages||[]);setCharacters(d.characters||{});
        setQuests(d.quests||[]);setPlayers(d.players||{});setStarted(d.started||false);
        if(d.scene_image)setSceneImage(d.scene_image);
        if(d.initiative)setInitiative(d.initiative);
        if(d.current_turn!==undefined)setCurrentTurn(d.current_turn);
      }).subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[sessionId,playerName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{
    if(isHost&&!initialized&&started){setInitialized(true);launch(players);}
  },[isHost,initialized,started,players]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist=async(msgs,chars,qs,img,init,turn,pls)=>{
    await supabase.from("sessions").update({messages:msgs,characters:chars,quests:qs,scene_image:img,initiative:init,current_turn:turn,players:pls}).eq("code",sessionId);
  };

  const startCampaign=async()=>{
    const{data}=await supabase.from("sessions").select("players").eq("code",sessionId).single();
    await supabase.from("sessions").update({started:true}).eq("code",sessionId);
    setStarted(true);setInitialized(true);launch(data?.players||players);
  };

  const fetchTTSChunk=async(text)=>{
    const res=await fetch("/api/tts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,voice:"fable"})});
    if(!res.ok)return null;
    const blob=await res.blob();
    return URL.createObjectURL(blob);
  };

  const playAudioUrl=(url)=>new Promise((resolve)=>{
    if(stopRef.current){URL.revokeObjectURL(url);resolve(false);return;}
    const audio=new Audio(url);
    audio._url=url;audioRef.current=audio;
    audio.onended=()=>{URL.revokeObjectURL(url);resolve(true);};
    audio.onerror=()=>{URL.revokeObjectURL(url);resolve(false);};
    audio.play().catch(()=>resolve(false));
  });

  const speakOpenAI=useCallback(async(text)=>{
    const t=cleanSpeech(text);if(!t)return false;
    const chunks=chunkText(t);
    stopRef.current=false;setSpeaking(true);
    const fetches=chunks.map(()=>null);
    const prefetch=(i)=>{if(i<chunks.length)fetches[i]=fetchTTSChunk(chunks[i]);};
    prefetch(0);prefetch(1);
    for(let i=0;i<chunks.length;i++){
      if(stopRef.current)break;
      prefetch(i+2);
      const url=await fetches[i];
      if(!url||stopRef.current)continue;
      await playAudioUrl(url);
    }
    setSpeaking(false);return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const speakBrowser=useCallback((text)=>{
    const t=cleanSpeech(text);if(!t)return;
    synthRef.current.cancel();clearInterval(kaRef.current);
    setTimeout(()=>{
      const u=new SpeechSynthesisUtterance(t);
      u.rate=0.88;u.pitch=0.82;u.volume=1;
      const vs=synthRef.current.getVoices();
      const v=vs.find(v=>v.name.includes("UK English Male")||v.name.includes("Daniel"))||vs.find(v=>v.lang.startsWith("en"))||vs[0];
      if(v)u.voice=v;
      u.onstart=()=>{setSpeaking(true);kaRef.current=setInterval(()=>{if(synthRef.current.paused)synthRef.current.resume();},10000);};
      u.onend=()=>{setSpeaking(false);clearInterval(kaRef.current);};
      u.onerror=(e)=>{if(e.error!=="interrupted")setSpeaking(false);clearInterval(kaRef.current);};
      synthRef.current.speak(u);
    },120);
  },[]);

  const stopAudio=useCallback(()=>{
    stopRef.current=true;
    if(audioRef.current){audioRef.current.pause();audioRef.current=null;}
    synthRef.current.cancel();clearInterval(kaRef.current);setSpeaking(false);
  },[]);

  const speak=useCallback(async(text)=>{
    if(!voiceOn||!text)return;
    stopAudio();
    const ok=await speakOpenAI(text);
    if(!ok)speakBrowser(text);
  },[voiceOn,speakOpenAI,speakBrowser,stopAudio]);

  const startListening=()=>{
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

  const askClaude=async(history,currentPlayers)=>{
    const playerArr=Object.values(currentPlayers||players);
    const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-opus-4-5",max_tokens:1400,system:buildSystemPrompt(setting,personality,playerArr,playerCount||2),messages:history.map(m=>({role:m.role,content:m.content}))})});
    if(!res.ok){const e=await res.json();throw new Error(e.error?.message||"Error "+res.status);}
    const data=await res.json();
    return data.content?.[0]?.text||"The DM ponders...";
  };

  const generateImage=async(prompt)=>{
    if(!prompt)return null;
    setImageLoading(true);
    try{
      const fullPrompt="Fantasy D&D scene, dramatic painterly illustration, cinematic lighting, highly detailed: "+prompt;
      const res=await fetch("/api/image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:fullPrompt,size:"1024x1024"})});
      const data=await res.json();
      if(res.ok&&data.url){setImageLoading(false);return data.url;}
      else console.error("Scene image failed:",data.error);
    }catch(e){console.error("Scene image exception:",e.message);}
    setImageLoading(false);return null;
  };

  const processDMReply=async(reply,prevChars,prevQuests,prevInit,prevTurn,currentImg,currentPlayers)=>{
    const sheetUpdates=parseAllSheets(reply);
    const newChars={...prevChars};
    Object.entries(sheetUpdates).forEach(([pName,charData])=>{
      const existing=prevChars[pName]||{};
      const reg=(currentPlayers||players||{})[pName]||{};
      const portrait=existing.portrait||reg.portrait||(pName===playerName?character?.portrait:null)||null;
      newChars[pName]={...reg,...existing,...charData,portrait,
        stats:(charData.stats&&Object.keys(charData.stats).length>0)?charData.stats:(existing.stats||reg.stats||{}),
        abilities:(charData.abilities&&charData.abilities.length>0)?charData.abilities:(existing.abilities||reg.abilities||[]),
        spells:(charData.spells&&charData.spells.length>0)?charData.spells:(existing.spells||reg.spells||[]),
        inventory:(charData.inventory&&charData.inventory.length>0)?charData.inventory:(existing.inventory||reg.inventory||[]),
      };
    });
    const questUpdate=parseTag(reply,"QUEST_UPDATE");
    const newQuests=questUpdate?[...prevQuests,...questUpdate.filter(q=>!prevQuests.find(eq=>eq.id===q.id))]:prevQuests;
    const initUpdate=parseTag(reply,"INITIATIVE");const newInit=initUpdate||prevInit;
    const turnUpdate=parseTag(reply,"TURN");const newTurn=turnUpdate||prevTurn;
    const imagePrompt=parseTag(reply,"SCENE_IMAGE");
    let newImage=currentImg;
    // Image generates in background — doesn't block TTS
    if(imagePrompt){
      generateImage(imagePrompt).then(url=>{if(url){setSceneImage(url);newImage=url;}});
    }
    if(Object.keys(sheetUpdates).length)setCharacters(newChars);
    if(questUpdate)setQuests(newQuests);
    if(initUpdate)setInitiative(newInit);
    if(turnUpdate)setCurrentTurn(newTurn);
    return{newChars,newQuests,newImage:currentImg,newInit,newTurn}; // return current img, new one updates async
  };

  const launch=async(currentPlayers)=>{
    setLoading(true);setImageLoading(true);
    try{
      const settingHint=setting||"High Fantasy";
      const prompt="The party has assembled. Welcome each player by name, describe their appearance based on their class and race, reference their backstories specifically. Then paint a vivid and exciting opening scene for the "+settingHint+" campaign. You MUST include a <SCENE_IMAGE> tag with a detailed visual description of the opening location. Also output <SHEET_UPDATE> for each player with their starting stats and equipment based on their class.";
      const quickScenePrompt=settingHint==="Pirates & Seas"?"A dramatic port tavern at dusk, weathered wooden docks, lanterns swaying, mysterious sailors":
        settingHint==="Dark Fantasy"?"A grim dark forest path at night, dead trees, ominous fog, distant flickering torches":
        settingHint==="Horror"?"An ancient crumbling mansion at midnight, lightning illuminating gargoyles, fog covering the ground":
        settingHint==="Sci-Fi D&D"?"A futuristic spaceport with ancient ruins visible, neon lights mixing with magical glows":
        "A grand medieval fantasy tavern interior, warm firelight, adventurers gathered, weapons on walls";

      // Start quick image in background immediately
      generateImage(quickScenePrompt).then(url=>{if(url)setSceneImage(url);});

      // Get DM reply
      const reply=await askClaude([{role:"user",content:prompt}],currentPlayers);
      const msg={role:"assistant",content:reply,id:Date.now(),player:"DM"};
      setMessages([msg]);

      // *** Speak immediately — don't wait for image ***
      speak(reply);
      setLoading(false);

      // Process sheets + generate better scene image in background
      const sheetUpdates=parseAllSheets(reply);
      const newChars={};
      Object.entries(sheetUpdates).forEach(([pName,charData])=>{
        const reg=(currentPlayers||{})[pName]||{};
        const portrait=reg.portrait||(pName===playerName?character?.portrait:null)||null;
        newChars[pName]={...reg,...charData,portrait,
          stats:(charData.stats&&Object.keys(charData.stats).length>0)?charData.stats:(reg.stats||{}),
          abilities:(charData.abilities&&charData.abilities.length>0)?charData.abilities:(reg.abilities||[]),
          spells:(charData.spells&&charData.spells.length>0)?charData.spells:(reg.spells||[]),
          inventory:(charData.inventory&&charData.inventory.length>0)?charData.inventory:(reg.inventory||[]),
        };
      });
      if(Object.keys(newChars).length)setCharacters(newChars);
      const questUpdate=parseTag(reply,"QUEST_UPDATE");if(questUpdate)setQuests(questUpdate);
      const initUpdate=parseTag(reply,"INITIATIVE");if(initUpdate)setInitiative(initUpdate);
      const turnUpdate=parseTag(reply,"TURN");if(turnUpdate)setCurrentTurn(turnUpdate);

      // Generate DM's specific scene image in background
      const dmScenePrompt=parseTag(reply,"SCENE_IMAGE");
      let finalImageUrl=null;
      if(dmScenePrompt){
        finalImageUrl=await generateImage(dmScenePrompt);
        if(finalImageUrl)setSceneImage(finalImageUrl);
      }

      await persist([msg],newChars,questUpdate||quests,finalImageUrl||null,initUpdate||initiative,turnUpdate||currentTurn,currentPlayers);
    }catch(e){
      console.error("Launch error:",e);setImageLoading(false);setLoading(false);
      setMessages([{role:"assistant",content:"Error starting campaign: "+e.message,id:Date.now()}]);
    }
  };

  const send=async(text)=>{
    if(!text.trim()||loading||!isHost)return;
    const userMsg={role:"user",content:text,id:Date.now(),player:playerName};
    const history=[...messages,userMsg];
    setMessages(history);setInput("");setLoading(true);stopAudio();
    try{
      const reply=await askClaude(history);
      const dmMsg={role:"assistant",content:reply,id:Date.now()+1,player:"DM"};
      const newMsgs=[...history,dmMsg];
      setMessages(newMsgs);

      const rollReq=parseRollRequest(reply);
      if(rollReq)setPendingRoll(rollReq);
      else setPendingRoll(null);

      // *** Speak immediately — image generates in background ***
      speak(reply);
      setLoading(false);

      // Process tags + image in background (non-blocking)
      const{newChars,newQuests,newInit,newTurn}=await processDMReply(reply,characters,quests,initiative,currentTurn,sceneImage,players);
      await persist(newMsgs,newChars,newQuests,sceneImage,newInit,newTurn,players);
    }catch(e){
      setMessages(p=>[...p,{role:"assistant",content:"Error: "+e.message,id:Date.now()+1}]);
      setLoading(false);
    }
  };

  const handleDMRollResult=({die,roll,modifier,total,isCrit,isFail})=>{
    setPendingRoll(null);
    const modStr=modifier!==0?` (${roll} ${modifier>=0?"+":"-"} ${Math.abs(modifier)} = ${total})`:"";
    let msg=`[ROLL_RESULT: ${total}${modStr}]`;
    if(isCrit)msg+=" — NATURAL 20! CRITICAL HIT!";
    if(isFail)msg+=" — NATURAL 1! CRITICAL FAIL!";
    send(msg);
  };

  const handleFreeRoll=({die,roll,modifier,total,isCrit,isFail})=>{
    setShowFreeRoll(false);
    let msg=`${playerName} rolled d${die}: ${roll}`;
    if(modifier!==0)msg+=` ${modifier>=0?"+":""} ${modifier} = ${total}`;
    if(isCrit)msg+=" — NATURAL 20! CRITICAL HIT!";
    if(isFail)msg+=" — NATURAL 1! CRITICAL FAIL!";
    send(msg);
  };

  const getPendingModifier=()=>{
    if(!pendingRoll)return 0;
    const key=(pendingRoll.ability||"").toUpperCase();
    const score=(myChar.stats||{})[key]||10;
    return Math.floor((score-10)/2);
  };

  const myCharSheet=characters[playerName]||{};
  const myChar={
    ...character,...myCharSheet,
    portrait:myCharSheet.portrait||character?.portrait||null,playerName,
    name:myCharSheet.name||character?.name,cls:myCharSheet.cls||character?.cls,
    race:myCharSheet.race||character?.race,backstory:character?.backstory,
    stats:(myCharSheet.stats&&Object.keys(myCharSheet.stats).length>0)?myCharSheet.stats:(character?.stats||{}),
    abilities:(myCharSheet.abilities&&myCharSheet.abilities.length>0)?myCharSheet.abilities:(character?.abilities||[]),
    spells:(myCharSheet.spells&&myCharSheet.spells.length>0)?myCharSheet.spells:(character?.spells||[]),
    inventory:(myCharSheet.inventory&&myCharSheet.inventory.length>0)?myCharSheet.inventory:(character?.inventory||[]),
    hp:myCharSheet.hp!==null&&myCharSheet.hp!==undefined?myCharSheet.hp:character?.hp,
    maxHp:myCharSheet.maxHp||character?.maxHp,ac:myCharSheet.ac||character?.ac,level:myCharSheet.level||character?.level||1,
  };

  const lastDM=[...messages].reverse().find(m=>m.role==="assistant");
  const activeQuests=quests.filter(q=>q.status==="active");
  const playerList=Object.values(players);
  const connectedCount=playerList.length;

  if(!started){
    return(
      <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 20% 0%,#1a0a2e 0%,#0d0d1a 40%,#000508 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Crimson Text',Georgia,serif",color:"#e8d5a3"}}>
        <div style={{background:"linear-gradient(135deg,rgba(28,13,4,.97),rgba(14,7,22,.97))",border:"1px solid rgba(212,170,60,.4)",borderRadius:"16px",padding:"36px",maxWidth:"480px",width:"100%",margin:"20px",textAlign:"center",boxShadow:"0 0 60px rgba(0,0,0,.8)"}}>
          <div style={{fontSize:"48px",marginBottom:"16px",animation:"breathe 3s ease-in-out infinite"}}>🐉</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"20px",fontWeight:700,background:"linear-gradient(135deg,#f4c842,#e8a020)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"3px",marginBottom:"8px"}}>WAITING FOR PARTY</div>
          <div style={{color:"#6a5030",fontFamily:"'Cinzel',serif",fontSize:"10px",letterSpacing:"2px",marginBottom:"24px"}}>SESSION: {sessionId}</div>
          <div style={{marginBottom:"20px"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"10px",color:"#7a5030",letterSpacing:"2px",marginBottom:"10px"}}>{connectedCount} / {playerCount} ADVENTURERS READY</div>
            <div style={{display:"flex",gap:"8px",justifyContent:"center",flexWrap:"wrap"}}>
              {playerList.map(p=>(
                <div key={p.playerName} style={{padding:"6px 12px",borderRadius:"20px",background:"rgba(40,20,5,.6)",border:"1px solid rgba(200,148,58,.3)",color:"#c8943a",fontFamily:"'Cinzel',serif",fontSize:"11px"}}>
                  {p.portrait&&<img src={p.portrait} alt="" style={{width:"20px",height:"20px",borderRadius:"50%",objectFit:"cover",marginRight:"6px",verticalAlign:"middle"}}/>}
                  ✅ {p.name||p.playerName}
                </div>
              ))}
              {Array.from({length:Math.max(0,playerCount-connectedCount)}).map((_,i)=>(
                <div key={"w"+i} style={{padding:"6px 12px",borderRadius:"20px",background:"rgba(20,10,3,.4)",border:"1px dashed rgba(200,148,58,.15)",color:"#3a2510",fontFamily:"'Cinzel',serif",fontSize:"11px"}}>⏳ Waiting...</div>
              ))}
            </div>
          </div>
          <div style={{color:"#6a5030",fontSize:"14px",lineHeight:1.6,marginBottom:"20px",fontFamily:"'Crimson Text',serif"}}>
            {isHost?"Once everyone has joined and created their character, start the adventure!":"Waiting for the host to start the campaign..."}
          </div>
          {isHost&&(
            <button onClick={startCampaign} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#5a3a00,#3a2000)",border:"1px solid #c8943a",borderRadius:"8px",color:"#f4c842",fontFamily:"'Cinzel',serif",fontSize:"14px",letterSpacing:"2px",cursor:"pointer",transition:"all .2s"}}>
              ⚔️ START THE CAMPAIGN
            </button>
          )}
          <div style={{color:"#3a2010",fontSize:"12px",marginTop:"12px",fontFamily:"'Cinzel',serif",letterSpacing:"1px"}}>Share code: <span style={{color:"#6a4020"}}>{sessionId}</span></div>
        </div>
        <style>{`@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`}</style>
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 20% 0%,#1a0a2e 0%,#0d0d1a 40%,#000508 100%)",fontFamily:"'Palatino Linotype','Book Antiqua',Georgia,serif",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden",color:"#e8d5a3"}}>
      {particles.map(p=>(
        <div key={p.id} style={{position:"fixed",left:p.x+"%",top:p.y+"%",width:p.size+"px",height:p.size+"px",background:"radial-gradient(circle,#f4c842,#c97b2a)",borderRadius:"50%",opacity:.25,pointerEvents:"none",zIndex:0,boxShadow:"0 0 5px #f4c842",animation:"fp "+p.dur+"s "+p.delay+"s ease-in-out infinite alternate"}}/>
      ))}
      <style>{`
        @keyframes fp{from{transform:translateY(0) scale(1);opacity:.18}to{transform:translateY(-22px) scale(1.2);opacity:.44}}
        @keyframes glow{0%,100%{box-shadow:0 0 12px rgba(212,170,60,.25)}50%{box-shadow:0 0 26px rgba(212,170,60,.55)}}
        @keyframes lpulse{0%,100%{box-shadow:0 0 0 0 rgba(220,80,80,.6)}50%{box-shadow:0 0 0 9px rgba(220,80,80,0)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes imgfade{from{opacity:0}to{opacity:1}}
        @keyframes turnpulse{0%,100%{box-shadow:0 0 0 0 rgba(100,255,100,.5)}50%{box-shadow:0 0 0 8px rgba(100,255,100,0)}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d0d1a}::-webkit-scrollbar-thumb{background:#4a3520;border-radius:3px}
        textarea:focus{outline:none;box-shadow:0 0 0 1px rgba(200,148,58,.3)}
        .qb:hover{background:rgba(212,170,60,.16)!important}
        .cb:hover{opacity:.75}
      `}</style>

      <header style={{position:"relative",zIndex:10,textAlign:"center",padding:"10px 16px 7px",borderBottom:"1px solid rgba(212,170,60,.13)",background:"rgba(0,0,0,.62)",backdropFilter:"blur(12px)"}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"clamp(13px,3vw,23px)",fontWeight:700,background:"linear-gradient(135deg,#f4c842 0%,#e8a020 40%,#f4c842 80%)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 4s linear infinite",letterSpacing:"3px"}}>⚔️ THE DUNGEON MASTER ⚔️</div>
        <div style={{fontSize:"9px",color:"#3a2015",letterSpacing:"2px",fontFamily:"'Cinzel',serif",marginTop:"2px"}}>{setting.toUpperCase()} · {playerCount} PLAYERS · CODE: <span style={{color:"#5a3515"}}>{sessionId}</span></div>
      </header>

      {(sceneImage||imageLoading)&&(
        <div style={{position:"relative",zIndex:5,maxWidth:"880px",width:"100%",margin:"0 auto",padding:"10px 16px 0"}}>
          {imageLoading&&!sceneImage
            ?<div style={{width:"100%",height:"200px",background:"rgba(20,10,5,.6)",borderRadius:"10px",border:"1px solid rgba(200,148,58,.15)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"10px",color:"#4a3020",fontFamily:"'Cinzel',serif",fontSize:"11px",letterSpacing:"2px"}}>
                <div style={{fontSize:"28px",animation:"breathe 1.5s infinite"}}>🖼️</div>PAINTING THE SCENE...
              </div>
            :<div style={{position:"relative",cursor:"pointer"}} onClick={()=>setLightbox(sceneImage)}>
                <img src={sceneImage} alt="Scene" style={{width:"100%",maxHeight:"280px",objectFit:"cover",borderRadius:"10px",border:"1px solid rgba(200,148,58,.25)",animation:"imgfade .8s ease",boxShadow:"0 4px 24px rgba(0,0,0,.8)",display:"block"}}/>
                {imageLoading&&<div style={{position:"absolute",bottom:"8px",left:"10px",background:"rgba(0,0,0,.7)",color:"#c8943a",fontFamily:"'Cinzel',serif",fontSize:"9px",letterSpacing:"1px",padding:"3px 8px",borderRadius:"10px",animation:"breathe 1s infinite"}}>🖼️ UPDATING...</div>}
                <div style={{position:"absolute",bottom:"8px",right:"10px",background:"rgba(0,0,0,.6)",color:"rgba(212,170,60,.7)",fontFamily:"'Cinzel',serif",fontSize:"9px",letterSpacing:"1px",padding:"3px 8px",borderRadius:"10px"}}>🔍 CLICK TO EXPAND</div>
              </div>
          }
        </div>
      )}

      <main style={{flex:1,overflowY:"auto",padding:"12px 16px",position:"relative",zIndex:5,maxWidth:"880px",width:"100%",margin:"0 auto"}}>
        {messages.map((msg,i)=>(
          <div key={msg.id||i} style={{animation:"fadeUp .35s ease forwards",marginBottom:"14px",display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
            {msg.role==="assistant"&&(
              <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,background:"radial-gradient(circle,#4a2a0a,#1a0a00)",border:"2px solid #c8943a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,marginRight:7,marginTop:3,boxShadow:"0 0 8px rgba(200,148,58,.3)",animation:"breathe 4s ease-in-out infinite"}}>🐉</div>
            )}
            <div style={{maxWidth:"82%",background:msg.role==="assistant"?"linear-gradient(135deg,rgba(22,10,2,.97),rgba(12,6,22,.97))":"linear-gradient(135deg,rgba(32,16,4,.93),rgba(42,22,2,.93))",border:"1px solid "+(msg.role==="assistant"?"rgba(200,148,58,.28)":"rgba(180,130,40,.18)"),borderRadius:msg.role==="assistant"?"4px 14px 14px 14px":"14px 4px 14px 14px",padding:"10px 14px",lineHeight:1.78,fontSize:"14.5px",color:msg.role==="assistant"?"#e8d5a3":"#f0e0b0",boxShadow:"0 3px 12px rgba(0,0,0,.4)",fontFamily:"'Crimson Text',Georgia,serif"}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"9px",letterSpacing:"2px",color:msg.role==="assistant"?"#c8943a":"#b09040",marginBottom:5,textAlign:msg.role==="user"?"right":"left"}}>{msg.role==="assistant"?"Dungeon Master":(msg.player||playerName)}</div>
              <div dangerouslySetInnerHTML={{__html:fmt(msg.content)}}/>
            </div>
            {msg.role==="user"&&(
              <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,border:"2px solid #a07830",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,marginLeft:7,marginTop:3,overflow:"hidden",background:myChar?.portrait?"none":"radial-gradient(circle,#2a1a00,#100800)"}}>
                {myChar?.portrait?<img src={myChar.portrait} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>:"⚔️"}
              </div>
            )}
          </div>
        ))}
        {loading&&(
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:"radial-gradient(circle,#4a2a0a,#1a0a00)",border:"2px solid #c8943a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,animation:"glow 1.4s infinite"}}>🐉</div>
            <div style={{background:"rgba(22,10,2,.95)",border:"1px solid rgba(200,148,58,.22)",borderRadius:"4px 14px 14px 14px",padding:"10px 14px",display:"flex",gap:5,alignItems:"center"}}>
              {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"#c8943a",opacity:.7,animation:"bounce .9s "+(i*.18)+"s ease-in-out infinite"}}/>)}
              <span style={{color:"#6a4020",fontSize:11,marginLeft:5,fontFamily:"'Cinzel',serif"}}>Consulting the ancient tomes...</span>
            </div>
          </div>
        )}
        {!isHost&&messages.length>0&&<div style={{textAlign:"center",color:"#3a2010",fontSize:"13px",fontFamily:"'Crimson Text',serif",marginTop:"14px",fontStyle:"italic"}}>Watching as {playerName}</div>}
        <div ref={bottomRef}/>
      </main>

      <div style={{position:"relative",zIndex:10,background:"rgba(0,0,0,.68)",backdropFilter:"blur(10px)",borderTop:"1px solid rgba(212,170,60,.1)",padding:"8px 14px",maxWidth:"880px",width:"100%",margin:"0 auto"}}>
        <div style={{display:"flex",gap:"7px",overflowX:"auto",paddingBottom:"2px"}}>
          <PlayerCard p={myChar} isMe={true} isTurn={currentTurn===playerName} initiative={initiative} onClick={()=>setShowSheet(true)}/>
          {playerList.filter(p=>p.playerName!==playerName).map(p=>{
            const sheet=characters[p.playerName]||{};
            const merged={...sheet,portrait:sheet.portrait||p.portrait||null,playerName:p.playerName,name:sheet.name||p.name,cls:sheet.cls||p.cls,race:sheet.race||p.race};
            return <PlayerCard key={p.playerName} p={merged} isMe={false} isTurn={currentTurn===p.playerName} initiative={initiative}/>;
          })}
          {Array.from({length:Math.max(0,(playerCount||2)-playerList.length)}).map((_,i)=>(
            <div key={"e"+i} style={{width:"72px",flexShrink:0,height:"72px",borderRadius:"10px",background:"rgba(16,8,3,.3)",border:"1px dashed rgba(200,148,58,.07)",display:"flex",alignItems:"center",justifyContent:"center",color:"#1a0e04",fontFamily:"'Cinzel',serif",fontSize:"20px"}}>+</div>
          ))}
        </div>
      </div>

      {showQuests&&activeQuests.length>0&&(
        <div style={{position:"relative",zIndex:10,maxWidth:"880px",width:"100%",margin:"0 auto",padding:"0 14px 5px"}}>
          <div style={{background:"rgba(14,7,2,.92)",border:"1px solid rgba(200,148,58,.16)",borderRadius:"8px",padding:"10px 12px"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"9px",color:"#6a4820",letterSpacing:"2px",marginBottom:"7px"}}>🏆 ACTIVE QUESTS</div>
            {activeQuests.map(q=>(
              <div key={q.id} style={{padding:"5px 8px",marginBottom:"4px",background:"rgba(0,0,0,.3)",borderRadius:"5px",border:"1px solid rgba(200,148,58,.1)"}}>
                <div style={{color:"#c09030",fontFamily:"'Cinzel',serif",fontSize:"11px"}}>{q.title}</div>
                <div style={{color:"#7a5830",fontSize:"12px",marginTop:"2px",fontFamily:"'Crimson Text',serif"}}>{q.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isHost&&(
        <div style={{position:"relative",zIndex:10,maxWidth:"880px",width:"100%",margin:"0 auto",padding:"0 14px 4px",display:"flex",gap:5,flexWrap:"wrap"}}>
          {QUICK.map(q=>(
            <button key={q} className="qb" onClick={()=>send(q)} disabled={!!pendingRoll||loading} style={{background:"rgba(212,170,60,.05)",border:"1px solid rgba(212,170,60,.12)",color:pendingRoll?"#2a1808":"#6a4820",borderRadius:11,padding:"3px 9px",fontSize:11,cursor:pendingRoll?"not-allowed":"pointer",fontFamily:"'Crimson Text',Georgia,serif",transition:"all .15s",whiteSpace:"nowrap",opacity:pendingRoll?0.4:1}}>{q}</button>
          ))}
        </div>
      )}

      <footer style={{position:"relative",zIndex:10,background:"rgba(0,0,0,.78)",backdropFilter:"blur(14px)",borderTop:"1px solid rgba(212,170,60,.1)",padding:"9px 13px"}}>
        {isHost?(
          <div style={{maxWidth:"880px",margin:"0 auto"}}>
            {pendingRoll?(
              <DiceRollerInline
                onRoll={handleDMRollResult}
                onClose={null}
                lockedDie={parseInt((pendingRoll.die||"d20").replace("d",""))||20}
                lockedModifier={getPendingModifier()}
                lockedLabel={pendingRoll.flavor}
                freeRoll={false}
              />
            ):(
              <div style={{display:"flex",gap:7,alignItems:"flex-end"}}>
                <button onClick={startListening} style={{width:40,height:40,borderRadius:"50%",flexShrink:0,background:listening?"radial-gradient(circle,#8b0000,#4a0000)":"radial-gradient(circle,#2a1500,#100a00)",border:"2px solid "+(listening?"#ff4040":"#6a4010"),color:listening?"#ff8080":"#c8943a",fontSize:14,cursor:"pointer",animation:listening?"lpulse 1s infinite":"none",display:"flex",alignItems:"center",justifyContent:"center"}}>{listening?"🔴":"🎤"}</button>
                <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}} placeholder={listening?"🎤 Listening...":"Type your action... (Enter to send)"} rows={2} style={{flex:1,background:"rgba(12,6,2,.93)",border:"1px solid rgba(200,148,58,.18)",borderRadius:8,padding:"8px 12px",color:"#e8d5a3",fontSize:14,resize:"none",fontFamily:"'Crimson Text',Georgia,serif",lineHeight:1.5}}/>
                <button onClick={()=>setShowFreeRoll(true)} title="Free Roll" style={{width:40,height:40,borderRadius:"50%",flexShrink:0,background:"radial-gradient(circle,#18082a,#080414)",border:"2px solid #6a4a9a",color:"#b080ef",fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>🎲</button>
                <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{width:40,height:40,borderRadius:"50%",flexShrink:0,background:(loading||!input.trim())?"radial-gradient(circle,#111,#080808)":"radial-gradient(circle,#5a3a00,#2a1800)",border:"2px solid "+((loading||!input.trim())?"#181818":"#d4aa3c"),color:(loading||!input.trim())?"#202020":"#f4c842",fontSize:16,cursor:(loading||!input.trim())?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",animation:(!loading&&input.trim())?"glow 2s infinite":"none"}}>⚡</button>
              </div>
            )}
            <div style={{display:"flex",gap:5,marginTop:7,alignItems:"center",flexWrap:"wrap"}}>
              <button className="cb" onClick={()=>setVoiceOn(v=>!v)} style={ctrlBtn(voiceOn)}>{voiceOn?"🔊 Voice":"🔇 Voice"}</button>
              {speaking&&<button className="cb" onClick={stopAudio} style={ctrlBtn(false,"#c84040","#ff8080")}>⏹ Stop</button>}
              {!speaking&&lastDM&&<button className="cb" onClick={()=>speak(lastDM.content)} style={ctrlBtn(false,"#4a7a5a","#70c080")}>🔁 Replay</button>}
              <button className="cb" onClick={()=>setShowQuests(v=>!v)} style={ctrlBtn(showQuests)}>🏆 Quests{activeQuests.length?" ("+activeQuests.length+")":""}</button>
              <button className="cb" onClick={()=>setShowMap(true)} style={ctrlBtn(false,"#2a4a6a","#507898")}>🗺️ Map</button>
              <div style={{flex:1}}/>
              {speaking&&<span style={{color:"#70c080",fontSize:9,fontFamily:"'Cinzel',serif"}}>🔊 SPEAKING...</span>}
              {pendingRoll&&<span style={{color:"#f4c842",fontSize:9,fontFamily:"'Cinzel',serif",animation:"glow 1s infinite"}}>🎲 ROLL REQUIRED</span>}
              <button className="cb" onClick={onLeave} style={{...ctrlBtn(false),color:"#2a1508"}}>✕ Leave</button>
            </div>
          </div>
        ):(
          <div style={{maxWidth:"880px",margin:"0 auto",display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{color:"#3a2010",fontFamily:"'Crimson Text',serif",fontSize:"13px",fontStyle:"italic",flex:1}}>👁️ Watching as {playerName}</div>
            <button className="cb" onClick={()=>setVoiceOn(v=>!v)} style={ctrlBtn(voiceOn)}>{voiceOn?"🔊 Voice":"🔇 Voice"}</button>
            {speaking&&<button className="cb" onClick={stopAudio} style={ctrlBtn(false,"#c84040","#ff8080")}>⏹ Stop</button>}
            {!speaking&&lastDM&&<button className="cb" onClick={()=>speak(lastDM.content)} style={ctrlBtn(false,"#4a7a5a","#70c080")}>🔁 Replay</button>}
            <button className="cb" onClick={()=>setShowMap(true)} style={ctrlBtn(false,"#2a4a6a","#507898")}>🗺️ Map</button>
            <button className="cb" onClick={onLeave} style={{...ctrlBtn(false),color:"#2a1508"}}>✕ Leave</button>
          </div>
        )}
      </footer>

      {showFreeRoll&&<DiceRollerInline onRoll={handleFreeRoll} onClose={()=>setShowFreeRoll(false)} freeRoll={true}/>}
      {showSheet&&<CharacterSheet character={myChar} playerName={playerName} onClose={()=>setShowSheet(false)}/>}
      {showMap&&<MapView players={players} characters={characters} mapData={null} onClose={()=>setShowMap(false)}/>}
      {lightbox&&(
        <div onClick={()=>setLightbox(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.93)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,cursor:"pointer",backdropFilter:"blur(8px)"}}>
          <img src={lightbox} alt="Expanded" style={{maxWidth:"95vw",maxHeight:"92vh",objectFit:"contain",borderRadius:"12px",border:"1px solid rgba(212,170,60,.25)",boxShadow:"0 0 60px rgba(0,0,0,.9)"}}/>
          <div style={{position:"absolute",top:"16px",right:"20px",color:"rgba(212,170,60,.5)",fontFamily:"'Cinzel',serif",fontSize:"11px",letterSpacing:"2px"}}>CLICK ANYWHERE TO CLOSE</div>
        </div>
      )}
    </div>
  );
}
