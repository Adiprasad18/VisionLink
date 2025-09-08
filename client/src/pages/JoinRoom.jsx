import React, { useState, useEffect } from "react";

export default function JoinRoom({ onJoin = () => {} }) {
  const goBack = () => {
    window.history.back();
  };
  const [activeTab, setActiveTab] = useState("join"); // "join" or "create"
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [generatedRoom, setGeneratedRoom] = useState("");

  // Generate a random room ID when the "Create Room" tab is selected
  useEffect(() => {
    if (activeTab === "create") {
      generateRandomRoomId();
    }
  }, [activeTab]);

  // Generate a random room ID
  const generateRandomRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedRoom(randomId);
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();

    // Validate inputs
    if (!username.trim() || !room.trim()) {
      alert("Please enter both username and room ID");
      return;
    }

    // Save to localStorage
    try {
      localStorage.setItem("username", username);
      localStorage.setItem("room", room);
    } catch (err) {
      console.error("Failed to save to localStorage:", err);
    }

    // Call onJoin prop
    onJoin({ email: username, room });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();

    // Validate inputs
    if (!username.trim()) {
      alert("Please enter your username");
      return;
    }

    // Save to localStorage
    try {
      localStorage.setItem("username", username);
      localStorage.setItem("room", generatedRoom);
    } catch (err) {
      console.error("Failed to save to localStorage:", err);
    }

    // Call onJoin prop
    onJoin({ email: username, room: generatedRoom });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-700 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob top-0 -left-4"></div>
      <div className="absolute w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animation-delay-2000 top-0 -right-4"></div>
      <div className="absolute w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animation-delay-4000 -bottom-8 left-20"></div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-white/10"
            style={{
              width: `${Math.random() * 10 + 5}px`,
              height: `${Math.random() * 10 + 5}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          ></div>
        ))}
      </div>
      
      <div className="relative z-10">
        {/* Back button and Logo */}
        <div className="flex justify-center mb-8 relative">
          <button 
            onClick={goBack}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all"
            aria-label="Go back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
          </button>
          
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-75 animate-pulse"></div>
            <div className="relative bg-white rounded-full p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 7l-7 5 7 5V7z"></path>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="relative bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl p-8 w-[480px]">
          {/* Tabs */}
          <div className="flex mb-8 bg-white/5 rounded-xl p-1.5">
            <button
              className={`flex-1 py-3 rounded-lg text-center transition-all font-medium ${
                activeTab === "join"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "text-gray-300 hover:text-white hover:bg-white/5"
              }`}
              onClick={() => setActiveTab("join")}
            >
              Join Room
            </button>
            <button
              className={`flex-1 py-3 rounded-lg text-center transition-all font-medium ${
                activeTab === "create"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "text-gray-300 hover:text-white hover:bg-white/5"
              }`}
              onClick={() => setActiveTab("create")}
            >
              Create Room
            </button>
          </div>

          {/* Join Room Form */}
          {activeTab === "join" && (
            <form onSubmit={handleJoinSubmit} className="space-y-5">
              <h2 className="text-3xl font-bold text-center text-white mb-2 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Join a Room
              </h2>
              <p className="text-center text-gray-300 mb-6">Enter your details to join an existing video call</p>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Your Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/10 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all shadow-sm group-hover:shadow-md"
                    placeholder="Enter your name"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl border border-purple-500/0 group-hover:border-purple-500/20 pointer-events-none transition-all"></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Room ID
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full bg-white/10 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all shadow-sm group-hover:shadow-md"
                    placeholder="Enter room ID"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl border border-purple-500/0 group-hover:border-purple-500/20 pointer-events-none transition-all"></div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl text-lg font-medium transition-all hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] mt-8"
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                  </svg>
                  Join Room
                </div>
              </button>
            </form>
          )}

          {/* Create Room Form */}
          {activeTab === "create" && (
            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <h2 className="text-3xl font-bold text-center text-white mb-2 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Create a New Room
              </h2>
              <p className="text-center text-gray-300 mb-6">Start a new video call and invite others to join</p>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Your Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/10 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all shadow-sm group-hover:shadow-md"
                    placeholder="Enter your name"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl border border-purple-500/0 group-hover:border-purple-500/20 pointer-events-none transition-all"></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Room ID (Generated)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={generatedRoom}
                    readOnly
                    className="w-full bg-white/10 border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all shadow-sm group-hover:shadow-md"
                  />
                  <div className="absolute inset-0 rounded-xl border border-purple-500/0 group-hover:border-purple-500/20 pointer-events-none transition-all"></div>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={generateRandomRoomId}
                      className="bg-purple-500/20 p-2 rounded-full text-purple-300 hover:text-white hover:bg-purple-500/30 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2v6h-6"></path>
                        <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                        <path d="M3 22v-6h6"></path>
                        <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 ml-1">This is your unique room code. Share it with others to invite them.</p>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl text-lg font-medium transition-all hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] mt-8"
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14"></path>
                    <path d="M5 12h14"></path>
                  </svg>
                  Create & Join Room
                </div>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
