import { useState } from "react";

const GRID = 12;
const CELL = 44;

const TERRAIN_COLORS = {
  wall: "#1a0a00",
  floor: "#2a1800",
  door: "#5a3a10",
  water: "#0a1a3a",
  trap: "#3a0a0a",
  treasure: "#3a3000",
  stairs: "#1a2a1a",
  empty: "#0d0a08",
};

const TERRAIN_ICONS = {
  wall: "▓",
  floor: "·",
  door: "🚪",
  water: "〰",
  trap: "⚠",
  treasure: "💰",
  stairs: "↕",
};

function classEmoji(cls) {
  const map={Fighter:"⚔",Wizard:"✦",Rogue:"◆",Cleric:"✚",Ranger:"◎",Paladin:"⊕",Bard:"♪",Druid:"✿",Barbarian:"◉",Monk:"⊗",Sorcerer:"★",Warlock:"☽"};
  return map[cls]||"●";
}

export default function MapView({ players, characters, mapData, onClose }) {
  const [grid, setGrid] = useState(() => {
    if (mapData?.grid) return mapData.grid;
    // Default dungeon room
    const g = Array.from({length:GRID},()=>Array(GRID).fill("floor"));
    for (let i=0;i<GRID;i++) { g[0][i]="wall";g[GRID-1][i]="wall";g[i][0]="wall";g[i][GRID-1]="wall"; }
    g[0][5]="door"; g[GRID-1][6]="door";
    g[3][3]="treasure"; g[8][8]="trap";
    g[2][8]="water"; g[3][8]="water"; g[2][9]="water";
    return g;
  });

  const [tokens, setTokens] = useState(() => {
    if (mapData?.tokens) return mapData.tokens;
    const t = {};
    Object.values(players||{}).forEach((p,i)=>{ t[p.playerName]={x:2+i,y:2}; });
    return t;
  });

  const [dragging, setDragging] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [paintTerrain, setPaintTerrain] = useState("wall");

  const handleCellClick = (x, y) => {
    if (editMode) {
      const newGrid = grid.map(row=>[...row]);
      newGrid[y][x] = paintTerrain;
      setGrid(newGrid);
    }
  };

  const handleTokenDrop = (playerName, x, y) => {
    if (x>=0&&x<GRID&&y>=0&&y<GRID&&grid[y][x]!=="wall") {
      setTokens(t=>({...t,[playerName]:{x,y}}));
    }
    setDragging(null);
  };

  const playerList = Object.values(players||{});

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:950,backdropFilter:"blur(6px)"}}>
      <div style={{background:"linear-gradient(135deg,rgba(16,8,2,.99),rgba(8,4,16,.99))",border:"1px solid rgba(212,170,60,.35)",borderRadius:"16px",padding:"20px",maxWidth:"95vw",maxHeight:"95vh",overflow:"auto",boxShadow:"0 0 60px rgba(0,0,0,.9)"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
          <div style={{fontFamily:"'Cinzel',serif",color:"#c8943a",fontSize:"14px",letterSpacing:"2px"}}>🗺️ DUNGEON MAP</div>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            <button onClick={()=>setEditMode(v=>!v)} style={{padding:"5px 12px",borderRadius:"6px",background:editMode?"rgba(200,148,58,.2)":"rgba(30,15,5,.6)",border:"1px solid "+(editMode?"#c8943a":"rgba(200,148,58,.2)"),color:editMode?"#f4c842":"#7a5030",fontFamily:"'Cinzel',serif",fontSize:"10px",letterSpacing:"1px",cursor:"pointer"}}>
              {editMode?"✏️ EDITING":"✏️ EDIT"}
            </button>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#5a4030",fontSize:"22px",cursor:"pointer",lineHeight:1}}>✕</button>
          </div>
        </div>

        {/* Terrain selector when editing */}
        {editMode && (
          <div style={{display:"flex",gap:"6px",marginBottom:"12px",flexWrap:"wrap"}}>
            {Object.keys(TERRAIN_COLORS).filter(t=>t!=="empty").map(t=>(
              <button key={t} onClick={()=>setPaintTerrain(t)} style={{padding:"4px 10px",borderRadius:"5px",border:"1px solid "+(paintTerrain===t?"#c8943a":"rgba(200,148,58,.15)"),background:TERRAIN_COLORS[t],color:"#c8a060",fontFamily:"'Cinzel',serif",fontSize:"9px",letterSpacing:"1px",cursor:"pointer"}}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div style={{display:"inline-block",border:"2px solid rgba(200,148,58,.3)",borderRadius:"4px",overflow:"hidden",position:"relative"}}
          onMouseUp={()=>setDragging(null)}>
          {grid.map((row,y)=>(
            <div key={y} style={{display:"flex"}}>
              {row.map((cell,x)=>{
                const tokenHere = Object.entries(tokens).filter(([,pos])=>pos.x===x&&pos.y===y);
                const isHovered = hoveredCell?.x===x&&hoveredCell?.y===y;
                return (
                  <div key={x}
                    style={{width:CELL+"px",height:CELL+"px",background:TERRAIN_COLORS[cell]||TERRAIN_COLORS.floor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",cursor:editMode?"crosshair":"default",border:"1px solid rgba(0,0,0,.4)",position:"relative",boxSizing:"border-box",transition:"background .1s",outline:isHovered?"1px solid rgba(200,148,58,.4)":"none"}}
                    onClick={()=>handleCellClick(x,y)}
                    onMouseEnter={()=>setHoveredCell({x,y})}
                    onMouseLeave={()=>setHoveredCell(null)}
                    onMouseUp={()=>dragging&&handleTokenDrop(dragging,x,y)}
                  >
                    {tokenHere.length===0&&cell!=="floor"&&<span style={{color:"rgba(200,148,58,.3)",fontSize:"14px"}}>{TERRAIN_ICONS[cell]||""}</span>}
                    {tokenHere.map(([pName],i)=>{
                      const char=characters[pName]||players[pName]||{};
                      return (
                        <div key={pName}
                          style={{width:"32px",height:"32px",borderRadius:"50%",background:char.portrait?"none":"radial-gradient(circle,#5a3a00,#2a1800)",border:"2px solid #f4c842",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",cursor:"grab",position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:10,boxShadow:"0 0 8px rgba(212,170,60,.6)",overflow:"hidden"}}
                          onMouseDown={()=>setDragging(pName)}
                          title={pName}>
                          {char.portrait?<img src={char.portrait} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:"#f4c842",fontSize:"12px"}}>{classEmoji(char.cls)}</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{marginTop:"12px",display:"flex",gap:"12px",flexWrap:"wrap"}}>
          {playerList.map(p=>(
            <div key={p.playerName} style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <div style={{width:"16px",height:"16px",borderRadius:"50%",background:"radial-gradient(circle,#5a3a00,#2a1800)",border:"2px solid #f4c842",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",color:"#f4c842",overflow:"hidden"}}>
                {(characters[p.playerName]||p).portrait?<img src={(characters[p.playerName]||p).portrait} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:classEmoji((characters[p.playerName]||p).cls)}
              </div>
              <span style={{color:"#9a7850",fontSize:"12px",fontFamily:"'Crimson Text',serif"}}>{p.name||p.playerName}</span>
            </div>
          ))}
          <div style={{color:"#4a3020",fontSize:"11px",fontFamily:"'Crimson Text',serif",marginLeft:"auto",fontStyle:"italic"}}>Drag tokens to move</div>
        </div>
      </div>
    </div>
  );
}
