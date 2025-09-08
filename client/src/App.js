import React, { useState } from "react";
import HomePage from "./pages/HomePage";
import JoinRoom from "./pages/JoinRoom";
import VideoCall from "./components/VideoCall";

function App() {
  const [step, setStep] = useState("home"); // 'home', 'join', 'call'
  const [user, setUser] = useState(null);

  const handleJoin = ({ email, room }) => {
    setUser({ email, room });
    localStorage.setItem("email", email);
    localStorage.setItem("room", room);
    setStep("call");
  };

  const handleContinue = () => {
    setStep("join");
  };

  if (step === "home") {
    return <HomePage onContinue={handleContinue} />;
  }

  if (step === "join") {
    return <JoinRoom onJoin={handleJoin} />;
  }

  if (step === "call" && user) {
    return <VideoCall username={user.email} room={user.room} />;
  }

  return null; // fallback
}

export default App;
