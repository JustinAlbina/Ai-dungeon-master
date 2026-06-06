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

const STAT_ARRAYS = {
  Fighter:   {STR:16,DEX:12,CON:14,INT:10,WIS:12,CHA:10},
  Wizard:    {STR:8, DEX:14,CON:12,INT:17,WIS:13,CHA:11},
  Rogue:     {STR:12,DEX:17,CON:12,INT:13,WIS:11,CHA:13},
  Cleric:    {STR:14,DEX:10,CON:14,INT:11,WIS:16,CHA:12},
  Ranger:    {STR:13,DEX:16,CON:13,INT:11,WIS:14,CHA:10},
  Paladin:   {STR:16,DEX:10,CON:14,INT:10,WIS:12,CHA:14},
  Bard:      {STR:10,DEX:14,CON:12,INT:13,WIS:11,CHA:17},
  Druid:     {STR:10,DEX:13,CON:13,INT:12,WIS:16,CHA:11},
  Barbarian: {STR:17,DEX:13,CON:15,INT:9, WIS:11,CHA:10},
  Monk:      {STR:13,DEX:16,CON:13,INT:11,WIS:15,CHA:9},
  Sorcerer:  {STR:8, DEX:13,CON:13,INT:12,WIS:11,CHA:17},
  Warlock:   {STR:10,DEX:13,CON:13,INT:12,WIS:12,CHA:16},
};

const CLASS_DATA = {
  Fighter:   {hp:12,maxHp:12,ac:16,abilities:[{name:"Second Wind",desc:"Bonus action: regain 1d10+1 HP once per short rest"},{name:"Fighting Style",desc:"Choose: Archery (+2 ranged), Defense (+1 AC), or Dueling (+2 damage one-handed)"}],inventory:["Longsword","Shield","Chain Mail","Explorer's Pack","5 GP"],spells:[]},
  Wizard:    {hp:6, maxHp:6, ac:12,abilities:[{name:"Arcane Recovery",desc:"Once per day, recover spell slots totaling half your wizard level (rounded up) during a short rest"},{name:"Spellcasting",desc:"Cast spells using INT. Spell save DC 13. Spell attack +5"}],inventory:["Quarterstaff","Spellbook","Component Pouch","Scholar's Pack","10 GP"],spells:[{name:"Magic Missile",level:1,desc:"Automatically deal 3×(1d4+1) force damage to targets"},{name:"Shield",level:1,desc:"Reaction: +5 AC until your next turn, blocks Magic Missile"},{name:"Fire Bolt",level:0,desc:"Cantrip: ranged spell attack, 1d10 fire damage"},{name:"Mage Hand",level:0,desc:"Cantrip: spectral hand, manipulate objects up to 30ft away"}]},
  Rogue:     {hp:8, maxHp:8, ac:13,abilities:[{name:"Sneak Attack",desc:"Once per turn, deal extra 1d6 damage when you have advantage or an ally is adjacent to target"},{name:"Thieves' Cant",desc:"Secret language of thieves and rogues"},{name:"Expertise",desc:"Double proficiency bonus for two chosen skills"}],inventory:["Shortsword","Shortbow","20 Arrows","Leather Armor","Thieves' Tools","Burglar's Pack","15 GP"],spells:[]},
  Cleric:    {hp:8, maxHp:8, ac:16,abilities:[{name:"Divine Domain",desc:"Life Domain: heal extra HP equal to 2+spell level when casting healing spells"},{name:"Turn Undead",desc:"Action: undead within 30ft must flee for 1 minute (WIS save DC 13)"},{name:"Spellcasting",desc:"Cast spells using WIS. Spell save DC 13. Spell attack +5"}],inventory:["Mace","Shield","Scale Mail","Holy Symbol","Priest's Pack","10 GP"],spells:[{name:"Cure Wounds",level:1,desc:"Touch: heal 1d8+3 HP"},{name:"Guiding Bolt",level:1,desc:"Ranged spell attack: 4d6 radiant damage, next attack has advantage"},{name:"Sacred Flame",level:0,desc:"Cantrip: DEX save or 1d8 radiant damage"},{name:"Thaumaturgy",level:0,desc:"Cantrip: minor miraculous effects — booming voice, flickering flames, tremors"}]},
  Ranger:    {hp:10,maxHp:10,ac:14,abilities:[{name:"Favored Enemy",desc:"Advantage on Survival checks to track chosen enemy type; learn one of their languages"},{name:"Natural Explorer",desc:"Expertise in one terrain type; difficult terrain doesn't slow your group"},{name:"Fighting Style",desc:"Archery: +2 to ranged attack rolls"}],inventory:["Longbow","20 Arrows","Shortsword","Leather Armor","Explorer's Pack","10 GP"],spells:[{name:"Hunter's Mark",level:1,desc:"Bonus action: mark a target. Deal extra 1d6 damage to it and track it easily"}]},
  Paladin:   {hp:12,maxHp:12,ac:18,abilities:[{name:"Divine Sense",desc:"Detect celestial, fiend, or undead within 60ft. Uses: 4/day"},{name:"Lay on Hands",desc:"Heal up to 5 HP total per long rest by touch; or expend 5 HP to cure disease/poison"},{name:"Divine Smite",desc:"When you hit, expend a spell slot to deal extra 2d8 radiant damage (more for higher slots)"}],inventory:["Longsword","Shield","Chain Mail","Holy Symbol","Priest's Pack","5 GP"],spells:[{name:"Bless",level:1,desc:"Up to 3 creatures: add 1d4 to attack rolls and saving throws for 1 minute"},{name:"Command",level:1,desc:"One creature must obey a one-word command (WIS save DC 12)"}]},
  Bard:      {hp:8, maxHp:8, ac:13,abilities:[{name:"Bardic Inspiration",desc:"Bonus action: grant an ally a d6 to add to one roll. Uses: 3/long rest"},{name:"Jack of All Trades",desc:"Add half proficiency bonus to any skill you aren't proficient in"},{name:"Spellcasting",desc:"Cast spells using CHA. Spell save DC 13. Spell attack +5"}],inventory:["Rapier","Lute","Leather Armor","Diplomat's Pack","15 GP"],spells:[{name:"Healing Word",level:1,desc:"Bonus action: heal 1d4+3 HP at range"},{name:"Thunderwave",level:1,desc:"Creatures in 15ft cube: CON save or 2d8 thunder damage and pushed 10ft"},{name:"Vicious Mockery",level:0,desc:"Cantrip: WIS save or 1d4 psychic damage and disadvantage on next attack"}]},
  Druid:     {hp:8, maxHp:8, ac:13,abilities:[{name:"Druidic",desc:"Secret language known only by druids"},{name:"Spellcasting",desc:"Cast spells using WIS. Spell save DC 13. Spell attack +5"},{name:"Wild Shape",desc:"Transform into a beast you've seen (CR 1/4 or lower). Uses: 2/short rest"}],inventory:["Quarterstaff","Wooden Shield","Leather Armor","Explorer's Pack","Druidic Focus","10 GP"],spells:[{name:"Entangle",level:1,desc:"Plants restrain creatures in 20ft square (STR save DC 13) for 1 minute"},{name:"Thunderwave",level:1,desc:"15ft cube: CON save or 2d8 thunder damage and pushed 10ft"},{name:"Shillelagh",level:0,desc:"Cantrip: your staff uses WIS for attack/damage and deals 1d8"},{name:"Produce Flame",level:0,desc:"Cantrip: throw flame for 1d8 fire damage at range"}]},
  Barbarian: {hp:14,maxHp:14,ac:14,abilities:[{name:"Rage",desc:"Bonus action: advantage on STR checks, +2 damage, resistance to physical damage for 1 min. Uses: 2/long rest"},{name:"Unarmored Defense",desc:"AC = 10 + DEX modifier + CON modifier when not wearing armor"},{name:"Reckless Attack",desc:"Advantage on STR attack rolls this turn, but attacks against you have advantage too"}],inventory:["Greataxe","Two Handaxes","Explorer's Pack","4 Javelins","10 GP"],spells:[]},
  Monk:      {hp:8, maxHp:8, ac:15,abilities:[{name:"Martial Arts",desc:"Unarmed strikes deal 1d4 damage. After attacking, bonus action unarmed strike"},{name:"Unarmored Defense",desc:"AC = 10 + DEX + WIS when unarmored"},{name:"Ki Points",desc:"3 points/short rest. Flurry of Blows (1 ki: 2 bonus unarmed strikes), Patient Defense (1 ki: Dodge), Step of the Wind (1 ki: Dash/Disengage)"}],inventory:["Shortsword","10 Darts","Explorer's Pack","10 GP"],spells:[]},
  Sorcerer:  {hp:6, maxHp:6, ac:12,abilities:[{name:"Sorcery Points",desc:"4 points/long rest. Convert to spell slots or use Metamagic"},{name:"Metamagic",desc:"Quickened Spell (2 pts: cast as bonus action), Twinned Spell (1+ pts: target second creature)"},{name:"Spellcasting",desc:"Cast spells using CHA. Spell save DC 13. Spell attack +5"}],inventory:["Quarterstaff","Component Pouch","Dungeoneer's Pack","15 GP"],spells:[{name:"Burning Hands",level:1,desc:"15ft cone: DEX save or 3d6 fire damage"},{name:"Magic Missile",level:1,desc:"Automatically deal 3×(1d4+1) force damage"},{name:"Fire Bolt",level:0,desc:"Cantrip: 1d10 fire damage ranged attack"},{name:"Minor Illusion",level:0,desc:"Cantrip: create sound or image within 30ft"}]},
  Warlock:   {hp:8, maxHp:8, ac:13,abilities:[{name:"Eldritch Invocations",desc:"Agonizing Blast: add CHA to Eldritch Blast damage. Armor of Shadows: cast Mage Armor at will"},{name:"Pact Magic",desc:"2 spell slots, regained on short rest. Spell save DC 13. Spell attack +5"},{name:"Patron",desc:"Your dark patron grants power in exchange for service — the details of this bargain are yours to define"}],inventory:["Light Crossbow","20 Bolts","Leather Armor","Scholar's Pack","10 GP"],spells:[{name:"Eldritch Blast",level:0,desc:"Cantrip: 1d10 force damage, range 120ft. Your signature attack"},{name:"Hex",level:1,desc:"Bonus action: curse a target — extra 1d6 necrotic on hits, disadvantage on chosen ability checks"}]},
};

function mod(score){ const m=Math.floor((score-10)/2); return (m>=0?"+":"")+m; }

export default function CharacterCreation({ playerName, onDone }) {
  const [step, setStep]             = useState(0); // 0=race,1=class,2=identity,3=backstory,4=generating,5=review
  const [race, setRace]             = useState("");
  const [cls, setCls]               = useState("");
  const [charName, setCharName]     = useState("");
  const [appearance, setAppearance] = useState("");
  const [backstory, setBackstory]   = useState("");
  const [customBack, setCustomBack] = useState("");
  const [genStatus, setGenStatus]   = useState("");
  const [finalChar, setFinalChar]   = useState(null);

  const canNext = [race!=="", cls!=="", charName.trim()!==""&&appearance.trim()!=="", backstory!==""&&(backstory!=="Write my own..."||customBack.trim()!=="")];

  const generateEverything = async () => {
    setStep(4);
    const finalBack = backstory==="Write my own..."?customBack:backstory;
    const stats = STAT_ARRAYS[cls]||{STR:12,DEX:12,CON:12,INT:12,WIS:12,CHA:12};
    const classData = CLASS_DATA[cls]||{hp:8,maxHp:8,ac:12,abilities:[],inventory:[],spells:[]};

    // Generate portrait
    setGenStatus("🎨 Painting your portrait...");
    let portraitUrl = null;
    try {
      const portraitPrompt = "Fantasy D&D character art, full body portrait, " + race + " " + cls + " named " + (charName||playerName) + ". Physical appearance: " + appearance + ". Style: dramatic painterly fantasy illustration, cinematic lighting, detailed armor and costume appropriate for a " + cls + ", heroic pose, dark atmospheric background, high detail.";
      const pRes = await fetch("/api/image", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({prompt: portraitPrompt, size: "1024x1024"})
      });
      const pData = await pRes.json();
      if (pRes.ok && pData.url) {
        portraitUrl = pData.url;
        console.log("Portrait generated:", portraitUrl);
      } else {
        console.error("Portrait generation failed:", pData.error || pData);
        setGenStatus("⚠️ Portrait failed: " + (pData.error || "Unknown error") + " — continuing without portrait");
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch(e) {
      console.error("Portrait exception:", e);
      setGenStatus("⚠️ Portrait error — continuing...");
      await new Promise(r => setTimeout(r, 1500));
    }

    setGenStatus("⚔️ Finalizing your character...");

    const char = {
      name: charName||playerName,
      race, cls,
      appearance, backstory: finalBack,
      portrait: portraitUrl,
      level: 1,
      ...classData,
      stats,
    };
    setFinalChar(char);
    setStep(5);
  };

  const wrap={minHeight:"100vh",background:"radial-gradient(ellipse at 20% 0%,#1a0a2e 0%,#0d0d1a 40%,#000508 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'Crimson Text',Georgia,serif",color:"#e8d5a3"};

  // STEP 4: Generating
  if(step===4) return (
    <div style={wrap}>
      <div style={{textAlign:"center",padding:"40px"}}>
        <div style={{fontSize:"60px",marginBottom:"20px",animation:"spin 2s linear infinite",display:"inline-block"}}>🎨</div>
        <div style={{fontFamily:"'Cinzel',serif",color:"#c8943a",fontSize:"16px",letterSpacing:"3px",marginBottom:"10px"}}>FORGING YOUR LEGEND</div>
        <div style={{color:"#6a5030",fontSize:"14px"}}>{genStatus}</div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  // STEP 5: Review completed character
  if(step===5&&finalChar) return (
    <div style={{...wrap,alignItems:"flex-start",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:"680px",margin:"0 auto"}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"11px",color:"#6a4820",letterSpacing:"3px",textAlign:"center",marginBottom:"16px"}}>YOUR CHARACTER IS READY</div>

        <div style={{background:"linear-gradient(135deg,rgba(24,11,3,.98),rgba(12,6,22,.98))",border:"1px solid rgba(212,170,60,.4)",borderRadius:"16px",padding:"24px",boxShadow:"0 0 40px rgba(0,0,0,.9)"}}>
          {/* Portrait + header */}
          <div style={{display:"flex",gap:"20px",marginBottom:"20px",alignItems:"flex-start"}}>
            <div style={{width:"120px",height:"160px",flexShrink:0,borderRadius:"10px",overflow:"hidden",border:"2px solid rgba(212,170,60,.4)",background:"rgba(20,10,5,.8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px"}}>
              {finalChar.portrait?<img src={finalChar.portrait} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>:"⚔️"}
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"22px",fontWeight:700,color:"#f4c842",marginBottom:"4px"}}>{finalChar.name}</div>
              <div style={{color:"#c8943a",fontFamily:"'Cinzel',serif",fontSize:"12px",letterSpacing:"1px",marginBottom:"10px"}}>Level 1 {finalChar.race} {finalChar.cls}</div>
              <div style={{fontSize:"13px",color:"#7a6040",fontStyle:"italic",fontFamily:"'Crimson Text',serif",lineHeight:1.5}}>{finalChar.backstory}</div>
              {/* HP / AC */}
              <div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
                {[{l:"HP",v:finalChar.hp+"/"+finalChar.maxHp,c:"#40c040"},{l:"AC",v:finalChar.ac,c:"#80b0ff"}].map(s=>(
                  <div key={s.l} style={{padding:"6px 12px",borderRadius:"6px",background:"rgba(0,0,0,.4)",border:"1px solid rgba(200,148,58,.15)",textAlign:"center"}}>
                    <div style={{color:"#5a4030",fontFamily:"'Cinzel',serif",fontSize:"8px",letterSpacing:"1px"}}>{s.l}</div>
                    <div style={{color:s.c,fontFamily:"'Cinzel',serif",fontSize:"15px",fontWeight:700}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{marginBottom:"16px"}}>
            <SectionTitle>ABILITY SCORES</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:"6px"}}>
              {Object.entries(finalChar.stats).map(([stat,val])=>(
                <div key={stat} style={{background:"rgba(0,0,0,.4)",borderRadius:"8px",padding:"8px 4px",textAlign:"center",border:"1px solid rgba(200,148,58,.12)"}}>
                  <div style={{color:"#5a4030",fontFamily:"'Cinzel',serif",fontSize:"8px",letterSpacing:"0.5px"}}>{stat}</div>
                  <div style={{color:"#f4c842",fontFamily:"'Cinzel',serif",fontSize:"18px",fontWeight:700,lineHeight:1}}>{val}</div>
                  <div style={{color:"#c8943a",fontSize:"11px",fontFamily:"'Cinzel',serif"}}>{mod(val)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Abilities */}
          <div style={{marginBottom:"16px"}}>
            <SectionTitle>ABILITIES & FEATURES</SectionTitle>
            {finalChar.abilities.map((a,i)=>(
              <div key={i} style={{padding:"8px 10px",marginBottom:"6px",background:"rgba(0,0,0,.3)",borderRadius:"6px",border:"1px solid rgba(200,148,58,.12)"}}>
                <div style={{color:"#c8943a",fontFamily:"'Cinzel',serif",fontSize:"11px",marginBottom:"2px"}}>{a.name}</div>
                <div style={{color:"#7a6040",fontSize:"12px",fontFamily:"'Crimson Text',serif",lineHeight:1.4}}>{a.desc}</div>
              </div>
            ))}
          </div>

          {/* Spells */}
          {finalChar.spells&&finalChar.spells.length>0&&(
            <div style={{marginBottom:"16px"}}>
              <SectionTitle>SPELLS</SectionTitle>
              {finalChar.spells.map((sp,i)=>(
                <div key={i} style={{padding:"7px 10px",marginBottom:"5px",background:"rgba(30,10,50,.4)",borderRadius:"6px",border:"1px solid rgba(150,80,200,.18)"}}>
                  <div style={{display:"flex",gap:"8px",alignItems:"baseline"}}>
                    <span style={{color:"#c080ff",fontFamily:"'Cinzel',serif",fontSize:"11px"}}>{sp.name}</span>
                    <span style={{color:"#6a4080",fontSize:"10px"}}>{sp.level===0?"Cantrip":"Level "+sp.level}</span>
                  </div>
                  <div style={{color:"#7a5090",fontSize:"12px",marginTop:"2px",fontFamily:"'Crimson Text',serif"}}>{sp.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* Inventory */}
          <div style={{marginBottom:"20px"}}>
            <SectionTitle>STARTING EQUIPMENT</SectionTitle>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
              {finalChar.inventory.map((item,i)=>(
                <div key={i} style={{padding:"4px 10px",borderRadius:"12px",background:"rgba(40,20,5,.5)",border:"1px solid rgba(200,148,58,.2)",color:"#c8a060",fontSize:"12px",fontFamily:"'Crimson Text',serif"}}>{item}</div>
              ))}
            </div>
          </div>

          <button onClick={()=>onDone(finalChar)} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#5a3a00,#3a2000)",border:"1px solid #c8943a",borderRadius:"10px",color:"#f4c842",fontFamily:"'Cinzel',serif",fontSize:"14px",letterSpacing:"3px",cursor:"pointer",transition:"all .2s"}}>
            ⚔️ JOIN THE WAITING ROOM
          </button>
        </div>
      </div>
    </div>
  );

  // STEPS 0-3: Character creation form
  const card={width:"100%",maxWidth:"600px",background:"linear-gradient(135deg,rgba(24,11,3,.98),rgba(12,6,22,.98))",border:"1px solid rgba(212,170,60,.4)",borderRadius:"20px",padding:"28px",boxShadow:"0 0 60px rgba(0,0,0,.9)"};

  return (
    <div style={wrap}>
      <div style={card}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"22px"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"20px",fontWeight:700,background:"linear-gradient(135deg,#f4c842,#e8a020,#f4c842)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"3px",marginBottom:"4px"}}>⚔️ CREATE YOUR CHARACTER</div>
          <div style={{color:"#5a4025",fontFamily:"'Cinzel',serif",fontSize:"10px",letterSpacing:"2px"}}>{playerName.toUpperCase()} · STEP {step+1} OF 4</div>
          <div style={{display:"flex",gap:"5px",justifyContent:"center",marginTop:"10px"}}>
            {["Race","Class","Identity","Backstory"].map((s,i)=>(
              <div key={s} style={{flex:1,height:"3px",borderRadius:"2px",maxWidth:"80px",background:i<=step?"#c8943a":"rgba(200,148,58,.15)",transition:"background .3s"}}/>
            ))}
          </div>
        </div>

        {step===0&&(
          <div>
            <STitle>Choose Your Race</STitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"7px"}}>
              {RACES.map(r=><ChoiceBtn key={r} selected={race===r} onClick={()=>setRace(r)}>{r}</ChoiceBtn>)}
            </div>
          </div>
        )}

        {step===1&&(
          <div>
            <STitle>Choose Your Class</STitle>
            <div style={{display:"flex",flexDirection:"column",gap:"6px",maxHeight:"400px",overflowY:"auto"}}>
              {CLASSES.map(c=>(
                <button key={c.name} onClick={()=>setCls(c.name)} style={{padding:"10px 14px",borderRadius:"8px",cursor:"pointer",textAlign:"left",background:cls===c.name?"linear-gradient(135deg,#3a2000,#2a1200)":"rgba(18,9,4,.7)",border:"1px solid "+(cls===c.name?"#c8943a":"rgba(200,148,58,.12)"),transition:"all .15s",display:"flex",alignItems:"center",gap:"11px"}}>
                  <span style={{fontSize:"18px",flexShrink:0}}>{c.icon}</span>
                  <div>
                    <div style={{fontSize:"14px",fontWeight:600,color:cls===c.name?"#f4c842":"#c8a060",fontFamily:"'Cinzel',serif"}}>{c.name}</div>
                    <div style={{fontSize:"12px",color:cls===c.name?"#c8943a":"#5a4030",marginTop:"1px",fontFamily:"'Crimson Text',serif"}}>{c.desc}</div>
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
            <textarea value={appearance} onChange={e=>setAppearance(e.target.value)} placeholder="e.g. Tall with silver hair, crimson eyes, a scar across the jaw, wearing worn leather armor. Intense and brooding expression." rows={4} style={{...iStyle,resize:"vertical"}}/>
            <div style={{color:"#4a3020",fontSize:"12px",marginTop:"5px"}}>The more detail you give, the better your portrait looks!</div>
          </div>
        )}

        {step===3&&(
          <div>
            <STitle>Your Backstory</STitle>
            <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"10px"}}>
              {BACKSTORIES.map(b=><ChoiceBtn key={b} selected={backstory===b} onClick={()=>setBackstory(b)}>{b}</ChoiceBtn>)}
            </div>
            {backstory==="Write my own..."&&<textarea value={customBack} onChange={e=>setCustomBack(e.target.value)} placeholder="Write your character's backstory..." rows={4} style={{...iStyle,resize:"vertical",marginTop:"8px"}}/>}
          </div>
        )}

        <div style={{display:"flex",gap:"10px",marginTop:"20px"}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"12px",borderRadius:"8px",cursor:"pointer",background:"transparent",border:"1px solid rgba(200,148,58,.15)",color:"#5a4030",fontFamily:"'Cinzel',serif",fontSize:"11px",letterSpacing:"1px"}}>← BACK</button>}
          {step<3
            ?<button onClick={()=>setStep(s=>s+1)} disabled={!canNext[step]} style={navBtn(canNext[step])}>NEXT →</button>
            :<button onClick={generateEverything} disabled={!canNext[3]} style={navBtn(canNext[3])}>⚔️ FORGE MY CHARACTER</button>
          }
        </div>
      </div>
    </div>
  );
}

function STitle({children}){return <div style={{fontFamily:"'Cinzel',serif",color:"#c8943a",fontSize:"12px",letterSpacing:"2px",marginBottom:"12px",borderBottom:"1px solid rgba(200,148,58,.18)",paddingBottom:"7px"}}>{children}</div>;}
function SLabel({children}){return <div style={{fontFamily:"'Cinzel',serif",color:"#7a5030",fontSize:"10px",letterSpacing:"1.5px",marginBottom:"6px",marginTop:"14px"}}>{children}</div>;}
function SectionTitle({children}){return <div style={{fontFamily:"'Cinzel',serif",fontSize:"9px",color:"#6a5030",letterSpacing:"2px",marginBottom:"8px",borderBottom:"1px solid rgba(200,148,58,.12)",paddingBottom:"4px"}}>{children}</div>;}
function ChoiceBtn({selected,onClick,children}){return <button onClick={onClick} style={{padding:"9px 14px",borderRadius:"7px",cursor:"pointer",textAlign:"left",background:selected?"linear-gradient(135deg,#3a2000,#2a1200)":"rgba(18,9,4,.7)",border:"1px solid "+(selected?"#c8943a":"rgba(200,148,58,.12)"),color:selected?"#f4c842":"#9a7050",fontFamily:"'Crimson Text',Georgia,serif",fontSize:"14px",transition:"all .15s"}}>{children}</button>;}
function navBtn(active){return{flex:2,padding:"12px",borderRadius:"8px",background:active?"linear-gradient(135deg,#5a3a00,#3a2000)":"rgba(20,10,5,.4)",border:"1px solid "+(active?"#c8943a":"rgba(200,148,58,.08)"),color:active?"#f4c842":"#3a2010",fontFamily:"'Cinzel',serif",fontSize:"12px",letterSpacing:"2px",cursor:active?"pointer":"not-allowed",transition:"all .2s"};}
const iStyle={width:"100%",background:"rgba(10,5,20,.9)",border:"1px solid rgba(200,148,58,.22)",borderRadius:"8px",padding:"10px 13px",color:"#e8d5a3",fontSize:"14px",fontFamily:"'Crimson Text',Georgia,serif",outline:"none",boxSizing:"border-box"};
