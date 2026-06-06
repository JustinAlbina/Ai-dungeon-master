import { useState } from "react";
import Lobby from "./Lobby";
import Game from "./Game";

export default function App() {
  const [session, setSession] = useState(null); // { sessionId, playerName, isHost }
  if (!session) return <Lobby onJoin={setSession} />;
  return <Game session={session} onLeave={() => setSession(null)} />;
}
