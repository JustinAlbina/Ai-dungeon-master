import { useState, useEffect } from "react";

const GEAR_SLOTS = ["Head","Chest","Legs","Feet","Main Hand","Off Hand","Ring","Amulet"];

function mod(score) { const m=Math.floor((score-10)/2); return (m>=0?"+":"")+m; }

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{position:"relative",display:"inline-block"}}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      {children}
      {show && text && (
        <div style={{position:"absolute",bottom:"110%",left:"50%",transform:"translateX(-50%)",background:"rgba(10,5,20,.98)",border:"1px solid rgba(200,148,58,.4)",borderRadius:"8px",padding:"8px 12px",minWidth:"180px",maxWidth:"240px",zIndex:999,color:"#c8a060",fontSize:"12px",fontFamily:"'Crimson Text',Georgia,serif",lineHeight:1.5,pointerEvents:"none",boxShadow:"0 4px 20px rgba(0,0,0,.8)"}}>
          {text}
        </div>
      )}
    </div>
  );
}

export default function CharacterSheet({ character, playerName, onClose }) {
  const [tab, setTab] = useState("stats");
  const [notes, setNotes] = useState("");

  // Load notes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("notes_" + playerName);
    if (saved) setNotes(saved);
  }, [playerName]);

  // Auto-save notes
  useEffect(() => {
    localStorage.setItem("notes_" + playerName, notes);
  }, [notes, playerName]);

  const c = character || {};
  const { name, cls, race, level=1, hp, maxHp, ac, stats={}, abilities=[], inventory=[], spells=[], portrait } = c;

  const gearMap = {};
  (inventory||[]).forEach(item => {
    if (typeof item === "object" && item.slot) gearMap[item.slot] = item;
    else if (typeof item === "string") {
      if (item.match(/sword|axe|bow|staff|dagger|mace|spear|wand|crossbow/i) && !gearMap["Main Hand"]) gearMap["Main Hand"] = { name: item };
      else if (item.match(/shield|buckler/i)) gearMap["Off Hand"] = { name: item };
      else if (item.match(/mail|armor|robe|leather|plate|hide/i)) gearMap["Chest"] = { name: item };
      else if (item.match(/helm|hat|hood|cap/i)) gearMap["Head"] = { name: item };
      else if (item.match(/boots|greaves|sandals/i)) gearMap["Feet"] = { name: item };
      else if (item.match(/ring/i)) gearMap["Ring"] = { name: item };
      else if (item.match(/amulet|necklace|symbol|pendant/i)) gearMap["Amulet"] = { name: item };
    }
  });

  const equippedNames = new Set(Object.values(gearMap).map(g => g?.name).filter(Boolean));
  const backpackItems = (inventory||[]).filter(item => {
    const n = typeof item === "object" ? item.name : item;
    return !equippedNames.has(n);
  });

  const hpPct = hp !== undefined && maxHp ? Math.max(0, Math.min(100, (hp/maxHp)*100)) : 100;
  const hpColor = hpPct < 30 ? "#ff4040" : hpPct < 60 ? "#ffaa00" : "#40c040";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:900,backdropFilter:"blur(4px)"}}>
      <div style={{display:"flex",height:"90vh",maxHeight:"860px",width:"90vw",maxWidth:"900px",borderRadius:"16px",overflow:"hidden",border:"1px solid rgba(212,170,60,.3)",boxShadow:"0 0 60px rgba(0,0,0,.9)"}}>

        {/* ── LEFT: Notes Panel ── */}
        <div style={{width:"260px",flexShrink:0,background:"linear-gradient(180deg,rgba(14,7,2,.99),rgba(8,4,14,.99))",borderRight:"1px solid rgba(200,148,58,.15)",display:"flex",flexDirection:"column",padding:"20px 16px"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"10px",color:"#6a5030",letterSpacing:"2px",marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
            📝 ADVENTURE NOTES
          </div>
          <div style={{color:"#4a3020",fontSize:"11px",fontFamily:"'Crimson Text',serif",marginBottom:"10px",fontStyle:"italic"}}>
            Jot down clues, NPC names, quest hints...
          </div>
          <textarea
            value={notes}
            onChange={e=>setNotes(e.target.value)}
            placeholder={"• NPC names\n• Quest clues\n• Important locations\n• Secrets discovered\n• Anything you want to remember..."}
            style={{
              flex:1, background:"rgba(8,4,2,.6)",
              border:"1px solid rgba(200,148,58,.15)",
              borderRadius:"8px", padding:"12px",
              color:"#c8a060", fontSize:"13px",
              fontFamily:"'Crimson Text',Georgia,serif",
              lineHeight:1.6, resize:"none", outline:"none",
              boxSizing:"border-box",
            }}
          />
          <div style={{marginTop:"8px",color:"#3a2010",fontSize:"10px",fontFamily:"'Cinzel',serif",letterSpacing:"1px",textAlign:"right"}}>
            AUTO-SAVED ✓
          </div>
        </div>

        {/* ── RIGHT: Character Sheet ── */}
        <div style={{flex:1,overflowY:"auto",background:"linear-gradient(180deg,rgba(18,8,3,.99) 0%,rgba(8,4,18,.99) 100%)"}}>
          {/* Header */}
          <div style={{padding:"18px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"10px",color:"#6a5030",letterSpacing:"2px"}}>📋 CHARACTER SHEET</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"10px",color:"#5a4030"}}>{playerName}</div>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#5a4030",fontSize:"20px",cursor:"pointer",lineHeight:1}}>✕</button>
          </div>

          {/* Portrait + Name */}
          <div style={{padding:"14px 20px",textAlign:"center"}}>
            <div style={{width:"130px",height:"180px",margin:"0 auto 10px",borderRadius:"12px",overflow:"hidden",border:"2px solid rgba(212,170,60,.4)",boxShadow:"0 0 20px rgba(0,0,0,.8)",background:"rgba(20,10,5,.8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"40px"}}>
              {portrait?<img src={portrait} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>:"⚔️"}
            </div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"18px",fontWeight:700,color:"#f4c842",marginBottom:"2px"}}>{name||playerName}</div>
            <div style={{color:"#c8943a",fontFamily:"'Cinzel',serif",fontSize:"11px",letterSpacing:"1px"}}>Level {level} {race} {cls}</div>

            {/* HP Bar */}
            <div style={{marginTop:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                <span style={{color:"#6a5030",fontFamily:"'Cinzel',serif",fontSize:"9px",letterSpacing:"1px"}}>HIT POINTS</span>
                <span style={{color:hpColor,fontFamily:"'Cinzel',serif",fontSize:"11px",fontWeight:700}}>{hp!==undefined&&hp!==null?hp+" / "+maxHp:"—"}</span>
              </div>
              <div style={{height:"5px",background:"rgba(0,0,0,.5)",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",width:hpPct+"%",background:hpColor,borderRadius:"3px",transition:"width .4s",boxShadow:"0 0 5px "+hpColor}}/>
              </div>
            </div>

            <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
              {[{l:"AC",v:ac||"—",c:"#80b0ff"},{l:"LEVEL",v:level,c:"#f4c842"},{l:"CLASS",v:cls||"—",c:"#c8943a"}].map(s=>(
                <div key={s.l} style={{flex:1,background:"rgba(0,0,0,.35)",borderRadius:"7px",padding:"6px 3px",border:"1px solid rgba(200,148,58,.12)",textAlign:"center"}}>
                  <div style={{color:"#5a4030",fontFamily:"'Cinzel',serif",fontSize:"8px",letterSpacing:"1px",marginBottom:"2px"}}>{s.l}</div>
                  <div style={{color:s.c,fontFamily:"'Cinzel',serif",fontSize:"13px",fontWeight:700}}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:"flex",borderBottom:"1px solid rgba(200,148,58,.15)",margin:"0 20px"}}>
            {[{id:"stats",label:"STATS"},{id:"abilities",label:"ABILITIES"},{id:"inventory",label:"GEAR"}].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 4px",background:"none",border:"none",borderBottom:"2px solid "+(tab===t.id?"#c8943a":"transparent"),color:tab===t.id?"#f4c842":"#5a4030",fontFamily:"'Cinzel',serif",fontSize:"10px",letterSpacing:"1px",cursor:"pointer",transition:"all .2s"}}>{t.label}</button>
            ))}
          </div>

          <div style={{padding:"14px 20px 24px"}}>

            {/* STATS */}
            {tab==="stats"&&(
              <div>
                {Object.keys(stats).length>0?(
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"7px",marginBottom:"14px"}}>
                      {Object.entries(stats).map(([stat,val])=>(
                        <div key={stat} style={{background:"rgba(0,0,0,.35)",borderRadius:"10px",padding:"9px 5px",textAlign:"center",border:"1px solid rgba(200,148,58,.12)"}}>
                          <div style={{color:"#6a5030",fontFamily:"'Cinzel',serif",fontSize:"8px",letterSpacing:"1px",marginBottom:"2px"}}>{stat}</div>
                          <div style={{color:"#f4c842",fontSize:"20px",fontFamily:"'Cinzel',serif",fontWeight:700,lineHeight:1}}>{val}</div>
                          <div style={{color:"#c8943a",fontSize:"11px",fontFamily:"'Cinzel',serif",marginTop:"2px"}}>{mod(val)}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:"9px",color:"#6a5030",letterSpacing:"2px",marginBottom:"7px",borderBottom:"1px solid rgba(200,148,58,.1)",paddingBottom:"4px"}}>SAVING THROWS</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px"}}>
                      {Object.entries(stats).map(([stat,val])=>(
                        <div key={stat} style={{display:"flex",justifyContent:"space-between",padding:"3px 8px",background:"rgba(0,0,0,.2)",borderRadius:"4px"}}>
                          <span style={{color:"#7a6040",fontSize:"12px",fontFamily:"'Crimson Text',serif"}}>{stat}</span>
                          <span style={{color:"#c8943a",fontSize:"12px",fontFamily:"'Cinzel',serif"}}>{mod(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ):<div style={{color:"#4a3020",fontSize:"14px",fontFamily:"'Crimson Text',serif",textAlign:"center",padding:"20px 0"}}>Stats will appear after character creation!</div>}
              </div>
            )}

            {/* ABILITIES */}
            {tab==="abilities"&&(
              <div>
                {abilities.length>0?abilities.map((a,i)=>(
                  <Tooltip key={i} text={a.desc}>
                    <div style={{padding:"9px 11px",marginBottom:"7px",background:"rgba(0,0,0,.3)",borderRadius:"8px",border:"1px solid rgba(200,148,58,.14)",cursor:"help"}}>
                      <div style={{color:"#c8943a",fontFamily:"'Cinzel',serif",fontSize:"11px",marginBottom:"2px"}}>{a.name}</div>
                      <div style={{color:"#7a6040",fontSize:"12px",fontFamily:"'Crimson Text',serif",lineHeight:1.4}}>{a.desc}</div>
                    </div>
                  </Tooltip>
                )):<div style={{color:"#4a3020",fontSize:"14px",fontFamily:"'Crimson Text',serif",textAlign:"center",padding:"20px 0"}}>Abilities appear after character creation!</div>}

                {spells.length>0&&(
                  <div style={{marginTop:"14px"}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:"9px",color:"#6a5030",letterSpacing:"2px",marginBottom:"7px",borderBottom:"1px solid rgba(200,148,58,.1)",paddingBottom:"4px"}}>SPELLS</div>
                    {spells.map((sp,i)=>(
                      <Tooltip key={i} text={sp.desc||sp.name}>
                        <div style={{padding:"7px 11px",marginBottom:"5px",background:"rgba(30,10,50,.4)",borderRadius:"7px",border:"1px solid rgba(150,80,200,.18)",cursor:"help",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                          <div>
                            <div style={{color:"#c080ff",fontFamily:"'Cinzel',serif",fontSize:"11px"}}>{sp.name}</div>
                            {sp.desc&&<div style={{color:"#7a5090",fontSize:"11px",marginTop:"2px",fontFamily:"'Crimson Text',serif"}}>{sp.desc}</div>}
                          </div>
                          {sp.level!==undefined&&<div style={{color:"#6a4080",fontFamily:"'Cinzel',serif",fontSize:"10px",flexShrink:0,marginLeft:"8px"}}>{sp.level===0?"Cantrip":"Lvl "+sp.level}</div>}
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* GEAR */}
            {tab==="inventory"&&(
              <div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:"9px",color:"#6a5030",letterSpacing:"2px",marginBottom:"7px"}}>EQUIPPED</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px",marginBottom:"14px"}}>
                  {GEAR_SLOTS.map(slot=>(
                    <Tooltip key={slot} text={gearMap[slot]?.desc||null}>
                      <div style={{padding:"7px 10px",borderRadius:"7px",border:"1px solid rgba(200,148,58,"+(gearMap[slot]?".22":".07")+")",background:gearMap[slot]?"rgba(40,20,5,.5)":"rgba(8,4,2,.3)",minHeight:"46px"}}>
                        <div style={{color:"#3a2010",fontFamily:"'Cinzel',serif",fontSize:"8px",letterSpacing:"1px",marginBottom:"2px"}}>{slot.toUpperCase()}</div>
                        <div style={{color:gearMap[slot]?"#c8a060":"#221408",fontSize:"12px",fontFamily:"'Crimson Text',serif"}}>{gearMap[slot]?.name||"—"}</div>
                      </div>
                    </Tooltip>
                  ))}
                </div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:"9px",color:"#6a5030",letterSpacing:"2px",marginBottom:"7px",borderTop:"1px solid rgba(200,148,58,.1)",paddingTop:"10px"}}>BACKPACK</div>
                {backpackItems.length>0?backpackItems.map((item,i)=>(
                  <div key={i} style={{padding:"5px 10px",borderBottom:"1px solid rgba(200,148,58,.06)",color:"#9a7850",fontSize:"13px",fontFamily:"'Crimson Text',serif"}}>
                    • {typeof item==="object"?item.name:item}
                  </div>
                )):<div style={{color:"#3a2010",fontSize:"13px",fontFamily:"'Crimson Text',serif"}}>Backpack is empty</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
