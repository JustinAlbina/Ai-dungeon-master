import { useState } from "react";

const GEAR_SLOTS = ["Head","Chest","Legs","Feet","Main Hand","Off Hand","Ring","Amulet","Backpack"];

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
  const [tab, setTab] = useState("stats"); // stats | abilities | inventory

  const c = character || {};
  const { name, cls, race, level=1, hp, maxHp, ac, stats={}, abilities=[], inventory=[], spells=[], portrait } = c;

  const gearMap = {};
  (inventory||[]).forEach(item => {
    if (typeof item === "object" && item.slot) gearMap[item.slot] = item;
    else if (typeof item === "string") {
      if (item.match(/sword|axe|bow|staff|dagger|mace|spear|wand/i)) gearMap["Main Hand"] = { name: item };
      else if (item.match(/shield|buckler/i)) gearMap["Off Hand"] = { name: item };
      else if (item.match(/mail|armor|robe|leather|plate/i)) gearMap["Chest"] = { name: item };
      else if (item.match(/helm|hat|hood/i)) gearMap["Head"] = { name: item };
      else if (item.match(/boots|greaves/i)) gearMap["Feet"] = { name: item };
      else if (item.match(/ring/i)) gearMap["Ring"] = { name: item };
      else if (item.match(/amulet|necklace|symbol/i)) gearMap["Amulet"] = { name: item };
    }
  });

  const backpackItems = (inventory||[]).filter(item => {
    if (typeof item === "object") return !item.slot;
    if (typeof item === "string") return !gearMap[Object.keys(gearMap).find(k => gearMap[k]?.name === item)];
    return true;
  });

  const hpPct = hp !== undefined && maxHp ? Math.max(0, Math.min(100, (hp/maxHp)*100)) : 100;
  const hpColor = hpPct < 30 ? "#ff4040" : hpPct < 60 ? "#ffaa00" : "#40c040";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",justifyContent:"flex-end",zIndex:900,backdropFilter:"blur(4px)"}}>
      <div style={{width:"380px",height:"100vh",overflowY:"auto",background:"linear-gradient(180deg,rgba(18,8,3,.99) 0%,rgba(8,4,18,.99) 100%)",borderLeft:"1px solid rgba(212,170,60,.3)",boxShadow:"-10px 0 40px rgba(0,0,0,.9)"}}>

        {/* Header */}
        <div style={{padding:"20px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"10px",color:"#6a5030",letterSpacing:"2px"}}>📋 CHARACTER SHEET</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#5a4030",fontSize:"20px",cursor:"pointer",lineHeight:1}}>✕</button>
        </div>

        {/* Portrait + Name */}
        <div style={{padding:"16px 20px",textAlign:"center"}}>
          <div style={{width:"140px",height:"200px",margin:"0 auto 12px",borderRadius:"12px",overflow:"hidden",border:"2px solid rgba(212,170,60,.4)",boxShadow:"0 0 20px rgba(0,0,0,.8)",background:"rgba(20,10,5,.8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"48px"}}>
            {portrait ? <img src={portrait} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/> : "⚔️"}
          </div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"20px",fontWeight:700,color:"#f4c842",marginBottom:"3px"}}>{name||playerName}</div>
          <div style={{color:"#c8943a",fontFamily:"'Cinzel',serif",fontSize:"11px",letterSpacing:"1px"}}>Level {level} {race} {cls}</div>

          {/* HP Bar */}
          <div style={{marginTop:"12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
              <span style={{color:"#6a5030",fontFamily:"'Cinzel',serif",fontSize:"9px",letterSpacing:"1px"}}>HIT POINTS</span>
              <span style={{color:hpColor,fontFamily:"'Cinzel',serif",fontSize:"11px",fontWeight:700}}>{hp!==undefined?hp+"  /  "+maxHp:"—"}</span>
            </div>
            <div style={{height:"6px",background:"rgba(0,0,0,.5)",borderRadius:"3px",overflow:"hidden",border:"1px solid rgba(0,0,0,.4)"}}>
              <div style={{height:"100%",width:hpPct+"%",background:hpColor,borderRadius:"3px",transition:"width .4s",boxShadow:"0 0 6px "+hpColor}}/>
            </div>
          </div>

          {/* AC + Level */}
          <div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
            {[{l:"ARMOR CLASS",v:ac||"—",c:"#80b0ff"},{l:"LEVEL",v:level,c:"#f4c842"},{l:"CLASS",v:cls||"—",c:"#c8943a"}].map(s=>(
              <div key={s.l} style={{flex:1,background:"rgba(0,0,0,.35)",borderRadius:"8px",padding:"8px 4px",border:"1px solid rgba(200,148,58,.12)",textAlign:"center"}}>
                <div style={{color:"#5a4030",fontFamily:"'Cinzel',serif",fontSize:"8px",letterSpacing:"1px",marginBottom:"3px"}}>{s.l}</div>
                <div style={{color:s.c,fontFamily:"'Cinzel',serif",fontSize:"14px",fontWeight:700}}>{s.v}</div>
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

        <div style={{padding:"16px 20px 30px"}}>

          {/* STATS TAB */}
          {tab==="stats" && (
            <div>
              {Object.keys(stats).length>0 ? (
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginBottom:"16px"}}>
                  {Object.entries(stats).map(([stat,val])=>(
                    <div key={stat} style={{background:"rgba(0,0,0,.35)",borderRadius:"10px",padding:"10px 6px",textAlign:"center",border:"1px solid rgba(200,148,58,.12)"}}>
                      <div style={{color:"#6a5030",fontFamily:"'Cinzel',serif",fontSize:"8px",letterSpacing:"1px",marginBottom:"2px"}}>{stat}</div>
                      <div style={{color:"#f4c842",fontSize:"22px",fontFamily:"'Cinzel',serif",fontWeight:700,lineHeight:1}}>{val}</div>
                      <div style={{color:"#c8943a",fontSize:"12px",fontFamily:"'Cinzel',serif",marginTop:"2px"}}>{mod(val)}</div>
                    </div>
                  ))}
                </div>
              ) : <div style={{color:"#4a3020",fontSize:"14px",fontFamily:"'Crimson Text',serif",textAlign:"center",padding:"20px 0"}}>Stats will appear after character creation!</div>}

              {/* Saving throws derived from stats */}
              {Object.keys(stats).length>0 && (
                <div>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:"9px",color:"#6a5030",letterSpacing:"2px",marginBottom:"8px",borderBottom:"1px solid rgba(200,148,58,.1)",paddingBottom:"5px"}}>SAVING THROWS</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px"}}>
                    {Object.entries(stats).map(([stat,val])=>(
                      <div key={stat} style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",background:"rgba(0,0,0,.2)",borderRadius:"4px"}}>
                        <span style={{color:"#7a6040",fontSize:"12px",fontFamily:"'Crimson Text',serif"}}>{stat}</span>
                        <span style={{color:"#c8943a",fontSize:"12px",fontFamily:"'Cinzel',serif"}}>{mod(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABILITIES TAB */}
          {tab==="abilities" && (
            <div>
              {abilities.length>0 ? abilities.map((a,i)=>(
                <Tooltip key={i} text={a.desc}>
                  <div style={{padding:"10px 12px",marginBottom:"8px",background:"rgba(0,0,0,.3)",borderRadius:"8px",border:"1px solid rgba(200,148,58,.15)",cursor:"help"}}>
                    <div style={{color:"#c8943a",fontFamily:"'Cinzel',serif",fontSize:"12px",marginBottom:"3px"}}>{a.name}</div>
                    <div style={{color:"#7a6040",fontSize:"12px",fontFamily:"'Crimson Text',serif",lineHeight:1.4}}>{a.desc}</div>
                  </div>
                </Tooltip>
              )) : <div style={{color:"#4a3020",fontSize:"14px",fontFamily:"'Crimson Text',serif",textAlign:"center",padding:"20px 0"}}>Abilities appear after character creation!</div>}

              {spells.length>0 && (
                <div style={{marginTop:"16px"}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:"9px",color:"#6a5030",letterSpacing:"2px",marginBottom:"8px",borderBottom:"1px solid rgba(200,148,58,.1)",paddingBottom:"5px"}}>SPELLS</div>
                  {spells.map((sp,i)=>(
                    <Tooltip key={i} text={sp.desc||sp.name}>
                      <div style={{padding:"8px 12px",marginBottom:"6px",background:"rgba(30,10,50,.4)",borderRadius:"8px",border:"1px solid rgba(150,80,200,.2)",cursor:"help",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{color:"#c080ff",fontFamily:"'Cinzel',serif",fontSize:"11px"}}>{sp.name}</div>
                          {sp.desc&&<div style={{color:"#7a5090",fontSize:"11px",marginTop:"2px",fontFamily:"'Crimson Text',serif"}}>{sp.desc}</div>}
                        </div>
                        {sp.level!==undefined&&<div style={{color:"#6a4080",fontFamily:"'Cinzel',serif",fontSize:"10px",flexShrink:0,marginLeft:"8px"}}>Lvl {sp.level}</div>}
                      </div>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GEAR TAB */}
          {tab==="inventory" && (
            <div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"9px",color:"#6a5030",letterSpacing:"2px",marginBottom:"8px"}}>EQUIPPED</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"16px"}}>
                {GEAR_SLOTS.filter(s=>s!=="Backpack").map(slot=>(
                  <Tooltip key={slot} text={gearMap[slot]?.desc||gearMap[slot]?.name||null}>
                    <div style={{padding:"8px 10px",borderRadius:"8px",border:"1px solid rgba(200,148,58,"+(gearMap[slot]?".25":".08")+")",background:gearMap[slot]?"rgba(40,20,5,.5)":"rgba(10,5,3,.3)",minHeight:"52px"}}>
                      <div style={{color:"#4a3020",fontFamily:"'Cinzel',serif",fontSize:"8px",letterSpacing:"1px",marginBottom:"3px"}}>{slot.toUpperCase()}</div>
                      <div style={{color:gearMap[slot]?"#c8a060":"#2a1a08",fontSize:"12px",fontFamily:"'Crimson Text',serif"}}>{gearMap[slot]?.name||"—"}</div>
                    </div>
                  </Tooltip>
                ))}
              </div>

              <div style={{fontFamily:"'Cinzel',serif",fontSize:"9px",color:"#6a5030",letterSpacing:"2px",marginBottom:"8px",borderTop:"1px solid rgba(200,148,58,.1)",paddingTop:"12px"}}>BACKPACK</div>
              {backpackItems.length>0 ? backpackItems.map((item,i)=>(
                <div key={i} style={{padding:"6px 10px",borderBottom:"1px solid rgba(200,148,58,.06)",color:"#9a7850",fontSize:"13px",fontFamily:"'Crimson Text',serif"}}>
                  • {typeof item==="object"?item.name:item}
                </div>
              )) : <div style={{color:"#3a2010",fontSize:"13px",fontFamily:"'Crimson Text',serif"}}>Backpack is empty</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
