import { useState } from "react";

const RACES = ["Human","Elf","Drow (Dark Elf)","Dwarf","Halfling","Gnome","Half-Orc","Tiefling","Dragonborn","Aasimar"];
const CLASSES = [
  { name: "Fighter", icon: "⚔️", desc: "Master of weapons and armor. Tough, reliable, hits hard." },
  { name: "Wizard", icon: "🔮", desc: "Powerful spellcaster. Fireballs, illusions, arcane mastery." },
  { name: "Rogue", icon: "🗡️", desc: "Sneaky and deadly. Lockpicking, backstabs, shadows." },
  { name: "Cleric", icon: "✨", desc: "Holy warrior-healer. Keep allies alive, smite evil." },
  { name: "Ranger", icon: "🏹", desc: "Wilderness hunter. Archery, tracking, animal companions." },
  { name: "Paladin", icon: "🛡️", desc: "Holy knight. Divine smites, oaths, heavy armor." },
  { name: "Bard", icon: "🎭", desc: "Charismatic performer. Magic through music, silver tongue." },
  { name: "Druid", icon: "🌿", desc: "Nature magic. Shapeshift into animals, command the wild." },
  { name: "Barbarian", icon: "💢", desc: "Rage-fueled warrior. Unstoppable force of nature." },
  { name: "Monk", icon: "👊", desc: "Martial artist. Ki energy, unarmed combat, lightning speed." },
  { name: "Sorcerer", icon: "⚡", desc: "Magic in the blood. Raw innate power, dramatic flair." },
  { name: "Warlock", icon: "👁️", desc: "Pact magic from a dark patron. Mysterious and dangerous." },
];
const BACKSTORIES = [
  "Orphan seeking revenge",
  "Former soldier, haunted by war",
  "Noble in exile",
  "Street thief turned adventurer",
  "Scholar chasing forbidden knowledge",
  "Chosen by prophecy",
  "Fleeing a dark past",
  "On a divine mission",
  "Just in it for the gold",
  "Write my own...",
];

export default function CharacterCreation({ playerName, sessionId, onDone }) {
  const [step, setStep]             = useState(0); // 0=race, 1=class, 2=appearance, 3=backstory, 4=generating
  const [race, setRace]             = useState("");
  const [cls, setCls]               = useState("");
  const [charName, setCharName]     = useState("");
  const [appearance, setAppearance] = useState("");
  const [backstory, setBackstory]   = useState("");
  const [customBack, setCustomBack] = useState("");
  const [portrait, setPortrait]     = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState("");

  const generatePortrait = async (name, race, cls, appearance) => {
    setGenerating(true);
    try {
      const prompt = `Fantasy D&D character portrait, ${race} ${cls} named ${name}. ${appearance || "heroic adventurer"}. Dramatic painterly style, detailed face, cinematic lighting, close-up bust portrait, intricate fantasy armor/clothing appropriate for the class.`;
      const res = await fetch("/api/image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size: "1024x1024" }),
      });
      if (res.ok) {
        const data = await res.json();
        setPortrait(data.url);
      }
    } catch (e) { console.error("Portrait gen error", e); }
    setGenerating(false);
  };

  const finish = async () => {
    setStep(4);
    const finalBack = backstory === "Write my own..." ? customBack : backstory;
    await generatePortrait(charName || playerName, race, cls, appearance);
    onDone({
      name: charName || playerName,
      race, cls,
      appearance,
      backstory: finalBack,
      portrait,
      level: 1,
      hp: null, maxHp: null, ac: null,
      stats: {}, abilities: [], inventory: [], spells: [],
    });
  };

  const canNext = [
    race !== "",
    cls !== "",
    (charName.trim() !== "" && appearance.trim() !== ""),
    backstory !== "" && (backstory !== "Write my own..." || customBack.trim() !== ""),
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 0%,#1a0a2e 0%,#0d0d1a 40%,#000508 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: "'Crimson Text',Georgia,serif", color: "#e8d5a3",
    }}>
      <div style={{
        width: "100%", maxWidth: "620px",
        background: "linear-gradient(135deg,rgba(24,11,3,.98),rgba(12,6,22,.98))",
        border: "1px solid rgba(212,170,60,.4)", borderRadius: "20px",
        padding: "32px", boxShadow: "0 0 60px rgba(0,0,0,.9)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: "22px", fontWeight: 700,
            background: "linear-gradient(135deg,#f4c842,#e8a020,#f4c842)", backgroundSize: "200% auto",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "3px", marginBottom: "4px",
          }}>⚔️ CREATE YOUR CHARACTER</div>
          <div style={{ color: "#5a4025", fontFamily: "'Cinzel',serif", fontSize: "10px", letterSpacing: "2px" }}>
            {playerName.toUpperCase()} · STEP {step + 1} OF 4
          </div>
          {/* Progress bar */}
          <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "14px" }}>
            {["Race","Class","Identity","Backstory"].map((s, i) => (
              <div key={s} style={{
                flex: 1, height: "3px", borderRadius: "2px", maxWidth: "80px",
                background: i <= step ? "#c8943a" : "rgba(200,148,58,.15)",
                transition: "background .3s",
              }} />
            ))}
          </div>
        </div>

        {/* Step 4: Generating */}
        {step === 4 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "20px",
              animation: "spin 2s linear infinite", display: "inline-block" }}>🎨</div>
            <div style={{ fontFamily: "'Cinzel',serif", color: "#c8943a", fontSize: "14px", letterSpacing: "2px" }}>
              PAINTING YOUR PORTRAIT...
            </div>
            <div style={{ color: "#6a5030", fontSize: "13px", marginTop: "8px" }}>
              The artists of the realm are at work
            </div>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
          </div>
        )}

        {/* Step 0: Race */}
        {step === 0 && (
          <div>
            <SectionTitle>Choose Your Race</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "8px" }}>
              {RACES.map(r => (
                <button key={r} onClick={() => setRace(r)} style={{
                  padding: "10px 14px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                  background: race === r ? "linear-gradient(135deg,#3a2000,#2a1200)" : "rgba(20,10,5,.7)",
                  border: "1px solid " + (race === r ? "#c8943a" : "rgba(200,148,58,.15)"),
                  color: race === r ? "#f4c842" : "#a08060",
                  fontFamily: "'Crimson Text',Georgia,serif", fontSize: "14px", transition: "all .15s",
                }}>{r}</button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Class */}
        {step === 1 && (
          <div>
            <SectionTitle>Choose Your Class</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {CLASSES.map(c => (
                <button key={c.name} onClick={() => setCls(c.name)} style={{
                  padding: "12px 16px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                  background: cls === c.name ? "linear-gradient(135deg,#3a2000,#2a1200)" : "rgba(20,10,5,.7)",
                  border: "1px solid " + (cls === c.name ? "#c8943a" : "rgba(200,148,58,.15)"),
                  color: cls === c.name ? "#f4c842" : "#a08060",
                  fontFamily: "'Crimson Text',Georgia,serif", transition: "all .15s",
                  display: "flex", alignItems: "center", gap: "12px",
                }}>
                  <span style={{ fontSize: "20px", flexShrink: 0 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: cls === c.name ? "#f4c842" : "#c8a060" }}>{c.name}</div>
                    <div style={{ fontSize: "13px", color: cls === c.name ? "#c8943a" : "#6a5030", marginTop: "2px" }}>{c.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Name + Appearance */}
        {step === 2 && (
          <div>
            <SectionTitle>Your Identity</SectionTitle>
            <Label>CHARACTER NAME</Label>
            <input value={charName} onChange={e => setCharName(e.target.value)}
              placeholder={playerName + "'s character name..."} style={inputStyle} />
            <Label>APPEARANCE <span style={{ color: "#5a4030", fontWeight: "normal" }}>(this shapes your AI portrait)</span></Label>
            <textarea value={appearance} onChange={e => setAppearance(e.target.value)}
              placeholder="e.g. Tall with silver hair, amber eyes, a scar across the left cheek, wearing dark leather armor with gold trim..."
              rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            <div style={{ color: "#5a4030", fontSize: "12px", marginTop: "6px" }}>
              The more detail you give, the better your portrait will look!
            </div>
          </div>
        )}

        {/* Step 3: Backstory */}
        {step === 3 && (
          <div>
            <SectionTitle>Your Backstory</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "14px" }}>
              {BACKSTORIES.map(b => (
                <button key={b} onClick={() => setBackstory(b)} style={{
                  padding: "10px 14px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                  background: backstory === b ? "linear-gradient(135deg,#3a2000,#2a1200)" : "rgba(20,10,5,.7)",
                  border: "1px solid " + (backstory === b ? "#c8943a" : "rgba(200,148,58,.15)"),
                  color: backstory === b ? "#f4c842" : "#a08060",
                  fontFamily: "'Crimson Text',Georgia,serif", fontSize: "14px", transition: "all .15s",
                }}>{b}</button>
              ))}
            </div>
            {backstory === "Write my own..." && (
              <textarea value={customBack} onChange={e => setCustomBack(e.target.value)}
                placeholder="Write your character's backstory..."
                rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            )}
          </div>
        )}

        {/* Navigation */}
        {step < 4 && (
          <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{
                flex: 1, padding: "12px", borderRadius: "8px", cursor: "pointer",
                background: "transparent", border: "1px solid rgba(200,148,58,.2)",
                color: "#6a5030", fontFamily: "'Cinzel',serif", fontSize: "12px", letterSpacing: "1px",
              }}>← BACK</button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext[step]} style={{
                flex: 2, padding: "12px", borderRadius: "8px",
                background: canNext[step] ? "linear-gradient(135deg,#5a3a00,#3a2000)" : "rgba(30,15,5,.5)",
                border: "1px solid " + (canNext[step] ? "#c8943a" : "rgba(200,148,58,.1)"),
                color: canNext[step] ? "#f4c842" : "#4a3020",
                fontFamily: "'Cinzel',serif", fontSize: "12px", letterSpacing: "2px",
                cursor: canNext[step] ? "pointer" : "not-allowed", transition: "all .2s",
              }}>NEXT →</button>
            ) : (
              <button onClick={finish} disabled={!canNext[3]} style={{
                flex: 2, padding: "12px", borderRadius: "8px",
                background: canNext[3] ? "linear-gradient(135deg,#5a3a00,#3a2000)" : "rgba(30,15,5,.5)",
                border: "1px solid " + (canNext[3] ? "#c8943a" : "rgba(200,148,58,.1)"),
                color: canNext[3] ? "#f4c842" : "#4a3020",
                fontFamily: "'Cinzel',serif", fontSize: "12px", letterSpacing: "2px",
                cursor: canNext[3] ? "pointer" : "not-allowed", transition: "all .2s",
              }}>⚔️ ENTER THE DUNGEON</button>
            )}
          </div>
        )}
        {error && <div style={{ color: "#ff7070", fontSize: "13px", textAlign: "center", marginTop: "10px" }}>{error}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontFamily: "'Cinzel',serif", color: "#c8943a", fontSize: "13px", letterSpacing: "2px", marginBottom: "14px", borderBottom: "1px solid rgba(200,148,58,.2)", paddingBottom: "8px" }}>{children}</div>;
}
function Label({ children }) {
  return <div style={{ fontFamily: "'Cinzel',serif", color: "#8a6040", fontSize: "10px", letterSpacing: "1.5px", marginBottom: "7px", marginTop: "16px" }}>{children}</div>;
}
const inputStyle = {
  width: "100%", background: "rgba(10,5,20,.9)",
  border: "1px solid rgba(200,148,58,.25)", borderRadius: "8px",
  padding: "11px 14px", color: "#e8d5a3", fontSize: "15px",
  fontFamily: "'Crimson Text',Georgia,serif", outline: "none", boxSizing: "border-box",
};
