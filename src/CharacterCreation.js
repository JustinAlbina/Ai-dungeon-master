import { useState } from "react";

const RACES = ["Human","Elf","Drow (Dark Elf)","Dwarf","Halfling","Gnome","Half-Orc","Tiefling","Dragonborn","Aasimar"];
const CLASSES = [
  {name:"Fighter",icon:"⚔️",desc:"Master of weapons and armor. Tough, reliable, hits hard."},
  {name:"Wizard",icon:"🔮",desc:"Powerful spellcaster. Fireballs, illusions, arcane mastery."},
  {name:"Rogue",icon:"🗡️",desc:"Sneaky and deadly. Lockpicking, backstabs, shadows."},
  {name:"Cleric",icon:"✨",desc:"Holy warrior-healer. Keep allies alive, smite evil."},
  {name:"Ranger",icon:"🏹",desc:"Wilderness hunter. Archery, tracking, animal companions."},
  {name:"Paladin",icon:"🛡️",desc:"Holy knight. Divine smites, oaths, heavy armor."},
  {name:"Bard",icon:"🎭",desc:"Charismatic performer. Magic through music, silver tongue."},
  {name:"Druid",icon:"🌿",desc:"Nature magic. Shapeshift into animals, command the wild."},
  {name:"Barbarian",icon:"💢",desc:"Rage-fueled warrior. Unstoppable force of nature."},
  {name:"Monk",icon:"👊",desc:"Martial artist. Ki energy, unarmed combat, lightning speed."},
  {name:"Sorcerer",icon:"⚡",desc:"Magic in the blood. Raw innate power, dramatic flair."},
  {name:"Warlock",icon:"👁️",desc:"Pact magic from a dark patron. Mysterious and dangerous."},
];
const BACKSTORIES = [
  "Orphan seeking revenge","Former soldier, haunted by war","Noble in exile",
  "Street thief turned adventurer","Scholar chasing forbidden knowledge",
  "Chosen by prophecy","Fleeing a dark past","On a divine mission",
  "Just in it for the gold","Write my own...",
];

export default function CharacterCreation({ playerName, onDone }) {
  const [step, setStep]             = useState(0);
  const [race, setRace]             = useState("");
  const [cls, setCls]               = useState("");
  const [charName, setCharName]     = useState("");
  const [appearance, setAppearance] = useState("");
  const [backstory, setBackstory]   = useState("");
  const [customBack, setCustomBack] = useState("");
  const [portrait, setPortrait]     = useState(null);
  const [generating, setGenerating] = useState(false);

  const canNext = [race!=="", cls!=="", charName.trim()!==""&&appearance.trim()!=="", backstory!==""&&(backstory!=="Write my own..."||customBack.trim()!=="")];

  const finish = async () => {
    setStep(4);
    const finalBack = backstory==="Write my own..."?customBack:backstory;
    let portraitUrl = null;
    try {
      setGenerating(true);
      const prompt = "Fantasy D&D character portrait, full body, " + race + " " + cls + " named " + (charName||playerName) + ". " + (appearance||"heroic adventurer") + ". Dramatic painterly style, detailed, cinematic lighting, fantasy setting, intricate costume appropriate for class.";
      const res = await fetch("/api/image", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({prompt, size:"1024x1024"}),
      });
      if (res.ok) { const d = await res.json(); portraitUrl = d.url; setPortrait(d.url); }
    } catch(e) { console.error("Portrait error",e); }
    setGenerating(false);
    onDone({ name:charName||playerName, race, cls, appearance, backstory:finalBack, portrait:portraitUrl, level:1, hp:null, maxHp:null, ac:null, stats:{}, abilities:[], inventory:[], spells:[] });
  };

  const wrap = {minHeight:"100vh",background:"radial-gradient(ellipse at 20% 0%,#1a0a2e 0%,#0d0d1a 40%,#000508 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'Crimson Text',Georgia,serif",color:"#e8d5a3"};
  const card = {width:"100%",maxWidth:"600px",background:"linear-gradient(135deg,rgba(24,11,3,.98),rgba(12,6,22,.98))",border:"1px solid rgba(212,170,60,.4)",borderRadius:"20px",padding:"32px",boxShadow:"0 0 60px rgba(0,0,0,.9)"};

  if (step===4) return (
    <div style={wrap}><div style={{...card,textAlign:"center"}}>
      <div style={{fontSize:"48px",marginBottom:"16px",animation:"spin 2s linear infinite",display:"inline-block"}}>{generating?"🎨":"⚔️"}</div>
      <div style={{fontFamily:"'Cinzel',serif",color:"#c8943a",fontSize:"14px",letterSpacing:"2px",marginBottom:"8px"}}>{generating?"PAINTING YOUR PORTRAIT...":"ENTERING THE DUNGEON..."}</div>
      {portrait&&<img src={portrait} alt="Your character" style={{width:"160px",height:"160px",objectFit:"cover",borderRadius:"12px",border:"2px solid rgba(212,170,60,.4)",marginTop:"12px"}}/>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div></div>
  );

  return (
    <div style={wrap}><div style={card}>
      <div style={{textAlign:"center",marginBottom:"24px"}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"22px",fontWeight:700,background:"linear-gradient(135deg,#f4c842,#e8a020,#f4c842)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"3px",marginBottom:"4px"}}>⚔️ CREATE YOUR CHARACTER</div>
        <div style={{color:"#5a4025",fontFamily:"'Cinzel',serif",fontSize:"10px",letterSpacing:"2px"}}>{playerName.toUpperCase()} · STEP {step+1} OF 4</div>
        <div style={{display:"flex",gap:"6px",justifyContent:"center",marginTop:"12px"}}>
          {["Race","Class","Identity","Backstory"].map((s,i)=>(
            <div key={s} style={{flex:1,height:"3px",borderRadius:"2px",maxWidth:"80px",background:i<=step?"#c8943a":"rgba(200,148,58,.15)",transition:"background .3s"}}/>
          ))}
        </div>
      </div>

      {step===0&&(
        <div>
          <STitle>Choose Your Race</STitle>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"8px"}}>
            {RACES.map(r=><ChoiceBtn key={r} selected={race===r} onClick={()=>setRace(r)}>{r}</ChoiceBtn>)}
          </div>
        </div>
      )}

      {step===1&&(
        <div>
          <STitle>Choose Your Class</STitle>
          <div style={{display:"flex",flexDirection:"column",gap:"7px",maxHeight:"420px",overflowY:"auto"}}>
            {CLASSES.map(c=>(
              <button key={c.name} onClick={()=>setCls(c.name)} style={{padding:"11px 14px",borderRadius:"8px",cursor:"pointer",textAlign:"left",background:cls===c.name?"linear-gradient(135deg,#3a2000,#2a1200)":"rgba(20,10,5,.7)",border:"1px solid "+(cls===c.name?"#c8943a":"rgba(200,148,58,.12)"),color:cls===c.name?"#f4c842":"#a08060",fontFamily:"'Crimson Text',Georgia,serif",transition:"all .15s",display:"flex",alignItems:"center",gap:"12px"}}>
                <span style={{fontSize:"20px",flexShrink:0}}>{c.icon}</span>
                <div>
                  <div style={{fontSize:"15px",fontWeight:600,color:cls===c.name?"#f4c842":"#c8a060"}}>{c.name}</div>
                  <div style={{fontSize:"12px",color:cls===c.name?"#c8943a":"#5a4030",marginTop:"1px"}}>{c.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step===2&&(
        <div>
          <STitle>Your Identity</STitle>
          <SLabel>CHARACTER NAME</SLabel>
          <input value={charName} onChange={e=>setCharName(e.target.value)} placeholder={playerName+"'s character name..."} style={iStyle}/>
          <SLabel>APPEARANCE <span style={{color:"#4a3020",fontWeight:"normal"}}>(shapes your AI portrait)</span></SLabel>
          <textarea value={appearance} onChange={e=>setAppearance(e.target.value)} placeholder="e.g. Tall with silver hair, amber eyes, a scar across the left cheek, wearing dark leather armor with gold trim. Athletic build. Intense gaze." rows={4} style={{...iStyle,resize:"vertical"}}/>
          <div style={{color:"#4a3020",fontSize:"12px",marginTop:"5px"}}>More detail = better portrait!</div>
        </div>
      )}

      {step===3&&(
        <div>
          <STitle>Your Backstory</STitle>
          <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"12px"}}>
            {BACKSTORIES.map(b=><ChoiceBtn key={b} selected={backstory===b} onClick={()=>setBackstory(b)}>{b}</ChoiceBtn>)}
          </div>
          {backstory==="Write my own..."&&<textarea value={customBack} onChange={e=>setCustomBack(e.target.value)} placeholder="Write your character's backstory..." rows={4} style={{...iStyle,resize:"vertical"}}/>}
        </div>
      )}

      <div style={{display:"flex",gap:"10px",marginTop:"22px"}}>
        {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"12px",borderRadius:"8px",cursor:"pointer",background:"transparent",border:"1px solid rgba(200,148,58,.15)",color:"#5a4030",fontFamily:"'Cinzel',serif",fontSize:"11px",letterSpacing:"1px"}}>← BACK</button>}
        {step<3
          ?<button onClick={()=>setStep(s=>s+1)} disabled={!canNext[step]} style={{flex:2,padding:"12px",borderRadius:"8px",background:canNext[step]?"linear-gradient(135deg,#5a3a00,#3a2000)":"rgba(20,10,5,.4)",border:"1px solid "+(canNext[step]?"#c8943a":"rgba(200,148,58,.08)"),color:canNext[step]?"#f4c842":"#3a2010",fontFamily:"'Cinzel',serif",fontSize:"12px",letterSpacing:"2px",cursor:canNext[step]?"pointer":"not-allowed",transition:"all .2s"}}>NEXT →</button>
          :<button onClick={finish} disabled={!canNext[3]} style={{flex:2,padding:"12px",borderRadius:"8px",background:canNext[3]?"linear-gradient(135deg,#5a3a00,#3a2000)":"rgba(20,10,5,.4)",border:"1px solid "+(canNext[3]?"#c8943a":"rgba(200,148,58,.08)"),color:canNext[3]?"#f4c842":"#3a2010",fontFamily:"'Cinzel',serif",fontSize:"12px",letterSpacing:"2px",cursor:canNext[3]?"pointer":"not-allowed",transition:"all .2s"}}>⚔️ ENTER THE DUNGEON</button>
        }
      </div>
    </div></div>
  );
}

function STitle({children}){return <div style={{fontFamily:"'Cinzel',serif",color:"#c8943a",fontSize:"12px",letterSpacing:"2px",marginBottom:"12px",borderBottom:"1px solid rgba(200,148,58,.18)",paddingBottom:"8px"}}>{children}</div>;}
function SLabel({children}){return <div style={{fontFamily:"'Cinzel',serif",color:"#7a5030",fontSize:"10px",letterSpacing:"1.5px",marginBottom:"6px",marginTop:"14px"}}>{children}</div>;}
function ChoiceBtn({selected,onClick,children}){return <button onClick={onClick} style={{padding:"9px 14px",borderRadius:"7px",cursor:"pointer",textAlign:"left",background:selected?"linear-gradient(135deg,#3a2000,#2a1200)":"rgba(18,9,4,.7)",border:"1px solid "+(selected?"#c8943a":"rgba(200,148,58,.12)"),color:selected?"#f4c842":"#9a7050",fontFamily:"'Crimson Text',Georgia,serif",fontSize:"14px",transition:"all .15s"}}>{children}</button>;}
const iStyle={width:"100%",background:"rgba(10,5,20,.9)",border:"1px solid rgba(200,148,58,.22)",borderRadius:"8px",padding:"10px 13px",color:"#e8d5a3",fontSize:"14px",fontFamily:"'Crimson Text',Georgia,serif",outline:"none",boxSizing:"border-box"};
