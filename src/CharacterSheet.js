export default function CharacterSheet({ character, playerName, onClose }) {
  if (!character) return (
    <div style={overlay}>
      <div style={panel}>
        <Header name={playerName} onClose={onClose} />
        <div style={{ color: "#7a5030", fontSize: "15px", textAlign: "center", marginTop: "40px", fontFamily: "'Crimson Text',serif" }}>
          No character yet — the DM will set you up during character creation!
        </div>
      </div>
    </div>
  );

  const { name, cls, race, level = 1, hp, maxHp, ac, stats = {}, abilities = [], inventory = [], spells = [] } = character;

  return (
    <div style={overlay}>
      <div style={panel}>
        <Header name={playerName} onClose={onClose} />

        {/* Name / Class / Race */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: "20px", color: "#f4c842", fontWeight: 700 }}>{name || playerName}</div>
          <div style={{ color: "#c8943a", fontSize: "13px", fontFamily: "'Cinzel',serif", letterSpacing: "1px", marginTop: "3px" }}>
            Level {level} {race} {cls}
          </div>
        </div>

        {/* HP / AC */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
          <StatBox label="HIT POINTS" value={hp !== undefined ? hp + " / " + maxHp : "—"} color={hp < maxHp * 0.3 ? "#ff6060" : "#60c060"} />
          <StatBox label="ARMOR CLASS" value={ac || "—"} color="#80b0ff" />
          <StatBox label="LEVEL" value={level} color="#f4c842" />
        </div>

        {/* Stats */}
        {Object.keys(stats).length > 0 && (
          <Section title="ABILITY SCORES">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
              {Object.entries(stats).map(([stat, val]) => (
                <div key={stat} style={{ background: "rgba(0,0,0,.3)", borderRadius: "8px", padding: "8px", textAlign: "center", border: "1px solid rgba(200,148,58,.15)" }}>
                  <div style={{ color: "#8a6040", fontFamily: "'Cinzel',serif", fontSize: "9px", letterSpacing: "1px" }}>{stat.toUpperCase()}</div>
                  <div style={{ color: "#f4c842", fontSize: "20px", fontFamily: "'Cinzel',serif", fontWeight: 700 }}>{val}</div>
                  <div style={{ color: "#a08050", fontSize: "11px" }}>{modifier(val)}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Abilities */}
        {abilities.length > 0 && (
          <Section title="ABILITIES & FEATURES">
            {abilities.map((a, i) => (
              <div key={i} style={{ padding: "7px 10px", marginBottom: "5px", background: "rgba(0,0,0,.25)", borderRadius: "6px", border: "1px solid rgba(200,148,58,.12)" }}>
                <div style={{ color: "#c8943a", fontFamily: "'Cinzel',serif", fontSize: "11px" }}>{a.name}</div>
                {a.desc && <div style={{ color: "#9a8060", fontSize: "13px", marginTop: "2px", fontFamily: "'Crimson Text',serif" }}>{a.desc}</div>}
              </div>
            ))}
          </Section>
        )}

        {/* Spells */}
        {spells.length > 0 && (
          <Section title="SPELLS">
            {spells.map((sp, i) => (
              <div key={i} style={{ padding: "6px 10px", marginBottom: "4px", background: "rgba(30,10,50,.4)", borderRadius: "6px", border: "1px solid rgba(150,80,200,.2)" }}>
                <span style={{ color: "#c080ff", fontFamily: "'Cinzel',serif", fontSize: "11px" }}>{sp.name}</span>
                {sp.level !== undefined && <span style={{ color: "#7a5090", fontSize: "11px", marginLeft: "8px" }}>Lvl {sp.level}</span>}
              </div>
            ))}
          </Section>
        )}

        {/* Inventory */}
        {inventory.length > 0 && (
          <Section title="INVENTORY">
            {inventory.map((item, i) => (
              <div key={i} style={{ padding: "5px 10px", marginBottom: "3px", color: "#a08060", fontSize: "14px", fontFamily: "'Crimson Text',serif", borderBottom: "1px solid rgba(200,148,58,.08)" }}>
                • {item}
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function modifier(score) {
  const mod = Math.floor((score - 10) / 2);
  return (mod >= 0 ? "+" : "") + mod;
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: "rgba(0,0,0,.3)", borderRadius: "10px", padding: "10px", textAlign: "center", border: "1px solid rgba(200,148,58,.18)" }}>
      <div style={{ color: "#6a5030", fontFamily: "'Cinzel',serif", fontSize: "8px", letterSpacing: "1px", marginBottom: "4px" }}>{label}</div>
      <div style={{ color: color || "#f4c842", fontFamily: "'Cinzel',serif", fontSize: "18px", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: "10px", color: "#8a6030", letterSpacing: "2px", marginBottom: "8px", borderBottom: "1px solid rgba(200,148,58,.15)", paddingBottom: "5px" }}>{title}</div>
      {children}
    </div>
  );
}

function Header({ name, onClose }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: "11px", color: "#6a5030", letterSpacing: "2px" }}>📋 CHARACTER SHEET</div>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: "11px", color: "#8a6040" }}>{name}</div>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#6a5030", fontSize: "18px", cursor: "pointer" }}>✕</button>
    </div>
  );
}

const overlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
  display: "flex", justifyContent: "flex-end", zIndex: 900,
  backdropFilter: "blur(4px)",
};

const panel = {
  width: "340px", height: "100vh", overflowY: "auto",
  background: "linear-gradient(180deg, rgba(20,10,5,.99) 0%, rgba(10,5,20,.99) 100%)",
  borderLeft: "1px solid rgba(212,170,60,.3)",
  padding: "24px 20px",
  boxShadow: "-10px 0 40px rgba(0,0,0,.8)",
};
