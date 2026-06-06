import { useState } from "react";

const DICE = [4, 6, 8, 10, 12, 20, 100];

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceRoller({ onRoll, onClose }) {
  const [selected, setSelected] = useState(20);
  const [modifier, setModifier] = useState(0);
  const [rolling, setRolling]   = useState(false);
  const [result, setResult]     = useState(null);
  const [display, setDisplay]   = useState(null);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setResult(null);
    let count = 0;
    const interval = setInterval(() => {
      setDisplay(rollDie(selected));
      count++;
      if (count > 12) {
        clearInterval(interval);
        const final = rollDie(selected);
        setDisplay(final);
        setResult(final);
        setRolling(false);
        const total = final + Number(modifier);
        const isCrit = selected === 20 && final === 20;
        const isFail = selected === 20 && final === 1;
        onRoll({ die: selected, roll: final, modifier: Number(modifier), total, isCrit, isFail });
      }
    }, 60);
  };

  const total = result !== null ? result + Number(modifier) : null;
  const isCrit = selected === 20 && result === 20;
  const isFail = selected === 20 && result === 1;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(6px)",
    }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(28,13,4,.99), rgba(14,7,22,.99))",
        border: "1px solid rgba(212,170,60,.5)", borderRadius: "20px",
        padding: "32px", width: "340px", textAlign: "center",
        boxShadow: "0 0 60px rgba(0,0,0,.9), 0 0 30px rgba(100,60,0,.3)",
      }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: "#f4c842", fontSize: "16px", letterSpacing: "3px", marginBottom: "20px" }}>
          🎲 DICE ROLLER
        </div>

        {/* Die selector */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", marginBottom: "20px" }}>
          {DICE.map(d => (
            <button key={d} onClick={() => { setSelected(d); setResult(null); }} style={{
              width: "44px", height: "44px", borderRadius: "8px",
              background: selected === d ? "linear-gradient(135deg,#5a3a00,#3a2000)" : "rgba(20,10,5,.8)",
              border: "1px solid " + (selected === d ? "#c8943a" : "rgba(200,148,58,.2)"),
              color: selected === d ? "#f4c842" : "#8a6040",
              fontFamily: "'Cinzel',serif", fontSize: "11px", cursor: "pointer", transition: "all .15s",
            }}>d{d}</button>
          ))}
        </div>

        {/* Dice display */}
        <div style={{
          width: "120px", height: "120px", margin: "0 auto 20px",
          background: rolling ? "radial-gradient(circle,#5a3a00,#2a1500)" : (
            isCrit ? "radial-gradient(circle,#1a4a1a,#0a2a0a)" :
            isFail ? "radial-gradient(circle,#4a1a1a,#2a0a0a)" :
            "radial-gradient(circle,#3a2500,#1a1000)"
          ),
          border: "2px solid " + (isCrit ? "#60ff60" : isFail ? "#ff6060" : "#c8943a"),
          borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: display !== null ? "52px" : "28px",
          color: isCrit ? "#60ff60" : isFail ? "#ff6060" : "#f4c842",
          fontFamily: "'Cinzel',serif", fontWeight: 700,
          boxShadow: rolling ? "0 0 30px rgba(200,148,58,.6)" : (
            isCrit ? "0 0 30px rgba(60,255,60,.5)" :
            isFail ? "0 0 30px rgba(255,60,60,.5)" : "none"
          ),
          transition: "all .1s",
          animation: rolling ? "spin .1s linear infinite" : "none",
        }}>
          {display !== null ? display : "d" + selected}
        </div>

        {/* Result */}
        {result !== null && (
          <div style={{ marginBottom: "16px" }}>
            {isCrit && <div style={{ color: "#60ff60", fontFamily: "'Cinzel',serif", fontSize: "14px", letterSpacing: "2px", marginBottom: "6px" }}>⚡ NATURAL 20! CRITICAL HIT!</div>}
            {isFail && <div style={{ color: "#ff6060", fontFamily: "'Cinzel',serif", fontSize: "14px", letterSpacing: "2px", marginBottom: "6px" }}>💀 NATURAL 1! CRITICAL FAIL!</div>}
            {modifier !== 0 && (
              <div style={{ color: "#c8a060", fontSize: "14px", fontFamily: "'Crimson Text',serif" }}>
                {result} {modifier >= 0 ? "+" : ""}{modifier} = <strong style={{ color: "#f4c842", fontSize: "18px" }}>{total}</strong>
              </div>
            )}
          </div>
        )}

        {/* Modifier */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", marginBottom: "20px" }}>
          <span style={{ color: "#8a6040", fontFamily: "'Cinzel',serif", fontSize: "11px", letterSpacing: "1px" }}>MODIFIER</span>
          <button onClick={() => setModifier(m => m - 1)} style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(20,10,5,.8)", border: "1px solid rgba(200,148,58,.2)", color: "#c8943a", cursor: "pointer", fontSize: "16px" }}>−</button>
          <span style={{ color: "#f4c842", fontFamily: "'Cinzel',serif", fontSize: "16px", minWidth: "30px", textAlign: "center" }}>{modifier >= 0 ? "+" : ""}{modifier}</span>
          <button onClick={() => setModifier(m => m + 1)} style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(20,10,5,.8)", border: "1px solid rgba(200,148,58,.2)", color: "#c8943a", cursor: "pointer", fontSize: "16px" }}>+</button>
        </div>

        <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>

        <button onClick={roll} disabled={rolling} style={{
          width: "100%", padding: "12px",
          background: rolling ? "rgba(30,15,5,.8)" : "linear-gradient(135deg,#5a3a00,#3a2000)",
          border: "1px solid " + (rolling ? "#4a3020" : "#c8943a"),
          borderRadius: "8px", color: rolling ? "#6a5030" : "#f4c842",
          fontFamily: "'Cinzel',serif", fontSize: "13px", letterSpacing: "2px",
          cursor: rolling ? "not-allowed" : "pointer", marginBottom: "10px",
          transition: "all .2s",
        }}>
          {rolling ? "🎲 ROLLING..." : "🎲 ROLL d" + selected}
        </button>

        <button onClick={onClose} style={{
          width: "100%", padding: "10px",
          background: "transparent", border: "1px solid rgba(200,148,58,.15)",
          borderRadius: "8px", color: "#5a4030",
          fontFamily: "'Cinzel',serif", fontSize: "11px", letterSpacing: "1px", cursor: "pointer",
        }}>CLOSE</button>
      </div>
    </div>
  );
}
