import { useState } from "react";
import Lobby from "./Lobby";
import CharacterCreation from "./CharacterCreation";
import Game from "./Game";

export default function App() {
  const [session, setSession]     = useState(null);
  const [character, setCharacter] = useState(null);
  if (!session) return <Lobby onJoin={setSession} />;
  if (!character) return <CharacterCreation playerName={session.playerName} onDone={setCharacter} />;
  return <Game session={session} character={character} onLeave={() => { setSession(null); setCharacter(null); }} />;
}
