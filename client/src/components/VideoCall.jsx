import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Sun,
  Moon,
  MessageCircle,
  X,
  Users,
  Settings,
  Copy,
  Volume2,
  VolumeX,
  Share2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const SOCKET_SERVER_URL = "http://localhost:8000";
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efree",
      credential: "efree",
    },
  ],
};

// Chat colors pool
const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
const userColors = {}; // { username: color }

export default function VideoChat({ username, room }) {
  const localVideoRef = useRef(null);
  const chatContainerRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> { pc, username, streamAssigned }
  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remotePeers, setRemotePeers] = useState([]); // [{id, username, stream}]
  const [focusedPeer, setFocusedPeer] = useState(null); // object from remotePeers or null -> grid
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [dark, setDark] = useState(true);
  const [layout, setLayout] = useState('grid'); // 'grid', 'spotlight', 'sidebar'
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good'); // 'good', 'fair', 'poor'
  const [blurBackground, setBlurBackground] = useState(false);

  // Chat
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]); // { user, text, time }
  const [typing, setTyping] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);

  // --- init socket ---
  useEffect(() => {
    console.log("Connecting to socket server:", SOCKET_SERVER_URL);
    
    // Try with multiple transport options
    const s = io(SOCKET_SERVER_URL, { 
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    
    s.on("connect", () => {
      console.log("Socket connected successfully with ID:", s.id);
      toast.success("Connected to server");
    });
    
    s.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      toast.error("Connection error: " + err.message);
    });
    
    s.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      if (reason === "io server disconnect") {
        // the disconnection was initiated by the server, reconnect manually
        s.connect();
      }
    });
    
    setSocket(s);
    
    return () => {
      console.log("Cleaning up socket connection");
      s.disconnect();
    };
  }, []);

  // --- get local media ---
  useEffect(() => {
    let mounted = true;
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!mounted) return;
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        // If we already have peers created before stream arrived, add tracks to them & create offers
        peersRef.current.forEach(({ pc, offered }) => {
          if (stream) {
            stream.getTracks().forEach((t) => pc.addTrack(t, stream));
          }
          // if not offered yet, create offer now
          if (!offered) {
            createOfferForPC(pc, Array.from(peersRef.current.keys()).find(id => peersRef.current.get(id).pc === pc));
          }
        });
      } catch (err) {
        toast.error("Allow camera/mic permissions");
        console.error(err);
      }
    };
    getMedia();
    return () => (mounted = false);
  }, []);

  // --- main socket event wiring ---
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      socket.emit("room:join", { email: username, room });
    });

    // when joining, server sends existing peers
    socket.on("room:peers", ({ peers }) => {
      peers.forEach(({ id, email }) => {
        if (!peersRef.current.has(id)) {
          const pc = createPeerConnection(id, email);
          peersRef.current.set(id, { pc, username: email, offered: false });
          // If we already have localStream, create offer immediately
          if (localStream) createOfferForPC(pc, id);
        }
      });
    });

    socket.on("user:joined", ({ id, email }) => {
      addSystemMessage(`${email} joined the call`);
      toast.success(`${email} joined`);
      if (!peersRef.current.has(id)) {
        const pc = createPeerConnection(id, email);
        peersRef.current.set(id, { pc, username: email, offered: false });
        if (localStream) createOfferForPC(pc, id);
      }
    });

    socket.on("incoming:call", async ({ from, offer, email }) => {
      // remote wants to connect to us
      await handleIncomingCall(from, offer, email);
    });

    socket.on("call:accepted", async ({ from, ans }) => {
      const entry = peersRef.current.get(from);
      if (entry?.pc) {
        try {
          await entry.pc.setRemoteDescription(ans);
        } catch (err) {
          console.warn("setRemoteDescription error", err);
        }
      }
    });

    socket.on("ice-candidate", ({ from, candidate }) => {
      const entry = peersRef.current.get(from);
      if (entry?.pc && candidate) {
        try {
          entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("addIceCandidate error", err);
        }
      }
    });

    socket.on("call:hangup", ({ from, email }) => {
      addSystemMessage(`${email} left the call`);
      toast(`${email} left`);
      const entry = peersRef.current.get(from);
      if (entry) {
        try {
          entry.pc.close();
        } catch {}
      }
      peersRef.current.delete(from);
      setRemotePeers((prev) => prev.filter((p) => p.id !== from));
    });

    // Chat
    socket.on("chatMessage", (msg) => {
      // Check if this is a message from the current user (to avoid duplicates)
      const isFromCurrentUser = msg.user === username;
      
      // Only add the message if it's not from the current user (we already added it locally)
      if (!isFromCurrentUser) {
        ensureUserColor(msg.user);
        setMessages((prev) => [
          ...prev,
          {
            user: msg.user,
            text: msg.text,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        
        // If chat is not visible, increment unread count
        if (!showChat) {
          setUnreadMessages(prev => prev + 1);
          // Play notification sound if speaker is on
          if (speakerOn) {
            const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAkJCQkJCQkJCQkJCQkJCQwMDAwMDAwMDAwMDAwMDAwMD4+Pj4+Pj4+Pj4+Pj4+Pj4//////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYAAAAAAAAAAbA/HBzUAAAAAAAD//MUxAAQwsYIAANPScAAAP/JMRmM5AQA/+MYxCUAEhIQAAMYSUAAAP/i0Mr/ygQA/+MYxCkAEXXwAAGNFMAAAP/4wGf/nCgA/+MYxDIAEP2AAAGHdcAAAP/4x3/8jwwA');
            audio.play().catch(e => console.error("Error playing notification sound:", e));
          }
        }
      }
      
      // Auto-scroll chat to bottom
      if (chatContainerRef.current) {
        setTimeout(() => {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }, 100);
      }
    });

    socket.on("typing", (user) => {
      if (user && user !== username) {
        setTyping(`${user} is typing...`);
        setTimeout(() => setTyping(""), 1600);
      }
    });

    return () => socket.removeAllListeners();
  }, [socket, localStream, username, room]);

  // --- helpers ---
  const ensureUserColor = (user) => {
    if (!userColors[user]) {
      const idx = Object.keys(userColors).length % COLORS.length;
      userColors[user] = COLORS[idx];
    }
    return userColors[user];
  };

  const addSystemMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        user: "System",
        text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  // create a new RTCPeerConnection wired to our socket & remote id
  const createPeerConnection = (remoteId, remoteName) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // attach local tracks if available
    if (localStream) {
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
    }

    // when remote track arrives
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      setRemotePeers((old) => {
        // if already present update stream
        const found = old.find((r) => r.id === remoteId);
        if (found) {
          return old.map((r) => (r.id === remoteId ? { ...r, stream, username: remoteName } : r));
        }
        return [...old, { id: remoteId, stream, username: remoteName }];
      });
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", { to: remoteId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        peersRef.current.delete(remoteId);
        setRemotePeers((old) => old.filter((r) => r.id !== remoteId));
      }
    };

    return pc;
  };

  // create an offer and mark offered flag
  const createOfferForPC = async (pc, remoteId) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("user:call", { to: remoteId, offer: pc.localDescription });
      // mark offered
      const entry = peersRef.current.get(remoteId);
      if (entry) peersRef.current.set(remoteId, { ...entry, offered: true });
    } catch (err) {
      console.error("createOffer error", err);
    }
  };

  // handle incoming call -> create answer and send
  const handleIncomingCall = async (from, offer, remoteName) => {
    try {
      // ensure there's pc for 'from'
      let entry = peersRef.current.get(from);
      if (!entry) {
        const pc = createPeerConnection(from, remoteName);
        peersRef.current.set(from, { pc, username: remoteName, offered: true });
        entry = peersRef.current.get(from);
      }
      const pc = entry.pc;
      await pc.setRemoteDescription(offer);
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      socket.emit("call:accepted", { to: from, ans: pc.localDescription });
    } catch (err) {
      console.error("handleIncomingCall error", err);
    }
  };

  // controls
  const toggleMic = () => {
    localStream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((p) => !p);
    toast.success(micOn ? 'Microphone muted' : 'Microphone unmuted', { 
      icon: micOn ? '🔇' : '🎙️',
      position: 'bottom-center',
      duration: 1500
    });
  };
  
  const toggleCam = () => {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOn((p) => !p);
    toast.success(camOn ? 'Camera turned off' : 'Camera turned on', { 
      icon: camOn ? '📵' : '📹',
      position: 'bottom-center',
      duration: 1500
    });
  };
  
  const toggleSpeaker = () => {
    setSpeakerOn(prev => !prev);
    // Mute/unmute all remote videos
    document.querySelectorAll('video:not([muted])').forEach(video => {
      video.muted = speakerOn;
    });
    toast.success(speakerOn ? 'Speaker muted' : 'Speaker unmuted', { 
      icon: speakerOn ? '🔇' : '🔊',
      position: 'bottom-center',
      duration: 1500
    });
  };

  const toggleChat = () => {
    setShowChat(prev => !prev);
    if (!showChat) {
      setUnreadMessages(0);
    }
  };

  const toggleParticipants = () => {
    setShowParticipants(prev => !prev);
    setShowSettings(false);
  };

  const toggleSettings = () => {
    setShowSettings(prev => !prev);
    setShowParticipants(false);
  };

  const toggleBlurBackground = () => {
    setBlurBackground(prev => !prev);
    toast.success(blurBackground ? 'Background blur disabled' : 'Background blur enabled', {
      position: 'bottom-center',
      duration: 1500
    });
  };

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}?room=${room}`;
    navigator.clipboard.writeText(roomLink)
      .then(() => {
        toast.success('Room link copied to clipboard!', {
          icon: '🔗',
          position: 'bottom-center'
        });
      })
      .catch(err => {
        console.error('Failed to copy room link:', err);
        toast.error('Failed to copy room link');
      });
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      peersRef.current.forEach(({ pc }) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      
      toast.success('Screen sharing started', {
        icon: '🖥️',
        position: 'bottom-center'
      });
      
      screenTrack.onended = () => {
        const camTrack = localStream?.getVideoTracks()[0];
        peersRef.current.forEach(({ pc }) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender && camTrack) sender.replaceTrack(camTrack);
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
        
        toast.success('Screen sharing stopped', {
          position: 'bottom-center'
        });
      };
    } catch (err) {
      toast.error("Screen share failed");
      console.error(err);
    }
  };

  const toggleRecording = () => {
    setIsRecording(prev => !prev);
    if (!isRecording) {
      toast.success('Recording started', {
        icon: '🔴',
        position: 'bottom-center'
      });
    } else {
      toast.success('Recording stopped', {
        position: 'bottom-center'
      });
    }
  };

  const changeLayout = (newLayout) => {
    setLayout(newLayout);
    setFocusedPeer(null);
  };

  const hangUp = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    peersRef.current.forEach(({ pc }) => {
      try {
        pc.close();
      } catch {}
    });
    peersRef.current.clear();
    setRemotePeers([]);
    setFocusedPeer(null);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    socket?.emit("call:hangup", { room, from: username });
    
    // Redirect to home page
    window.location.href = '/';
  };

  // chat
  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    socket?.emit("chatMessage", { user: username, text: message });
    setMessage("");
    ensureUserColor(username);
    setMessages((m) => [
      ...m,
      {
        user: username,
        text: message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const onTyping = () => {
    socket?.emit("typing", username);
  };

  // theme
  useEffect(() => {
    document.body.className = dark ? "dark" : "light";
  }, [dark]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current && showChat) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, showChat]);

  return (
    <div className={`flex flex-col min-h-screen ${dark ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-blue-50 to-indigo-100"}`}>
      <Toaster />
      
      {/* Header */}
      <div className={`flex justify-between items-center px-6 py-3 ${dark ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-gray-200"} backdrop-blur-md border-b z-10`}>
        <div className="flex items-center">
          <div className="relative mr-3">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur opacity-75"></div>
            <div className={`relative ${dark ? "bg-gray-800" : "bg-white"} rounded-full p-2`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 7l-7 5 7 5V7z"></path>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </div>
          </div>
          <div>
            <h2 className="font-bold text-lg">VisionLink</h2>
            <div className="flex items-center">
              <span className={`inline-block w-2 h-2 rounded-full ${connectionQuality === 'good' ? 'bg-green-500' : connectionQuality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'} mr-2`}></span>
              <span className="text-xs opacity-75">Room: {room}</span>
              <button onClick={copyRoomLink} className="ml-2 text-purple-500 hover:text-purple-600">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isRecording && (
            <div className="flex items-center mr-2">
              <span className="animate-pulse inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
              <span className="text-xs text-red-500">REC</span>
            </div>
          )}
          
          <button 
            onClick={toggleParticipants} 
            className={`p-2 rounded-full ${showParticipants ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-200/20'}`}
          >
            <Users className="w-5 h-5" />
          </button>
          
          <button 
            onClick={toggleSettings} 
            className={`p-2 rounded-full ${showSettings ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-200/20'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <button onClick={() => setDark((d) => !d)} className="p-2 rounded-full hover:bg-gray-200/20">
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 relative">
        {/* Main content area */}
        <div className="flex-1 p-4 relative">
          {/* Video grid */}
          <div className={`h-full flex items-center justify-center ${showChat || showParticipants || showSettings ? 'mr-80' : ''}`}>
            {layout === 'spotlight' && focusedPeer ? (
              <div className="w-full h-full flex flex-col items-center relative">
                {/* Large focused video */}
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    autoPlay
                    playsInline
                    className={`max-w-full max-h-[75vh] rounded-xl ${dark ? 'border-gray-700' : 'border-gray-300'} border shadow-lg ${blurBackground ? 'backdrop-blur-lg' : ''}`}
                    ref={(el) => {
                      if (el && focusedPeer.stream) el.srcObject = focusedPeer.stream;
                    }}
                  />
                  <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg text-white">
                    {focusedPeer.username}
                  </div>
                </div>

                {/* Thumbnails at bottom */}
                <div className="absolute bottom-4 right-4 flex gap-2 overflow-x-auto p-2">
                  <div className="relative">
                    <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`w-32 h-24 object-cover rounded-lg border ${dark ? 'border-gray-700' : 'border-gray-300'} shadow-md`} 
                    />
                    <div className="absolute bottom-1 left-1 right-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-white truncate text-center">
                      You
                    </div>
                    {!micOn && (
                      <div className="absolute top-1 right-1 bg-red-500 rounded-full p-1">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {remotePeers.filter(p => p.id !== focusedPeer.id).map(peer => (
                    <div key={peer.id} className="relative cursor-pointer" onClick={() => setFocusedPeer(peer)}>
                      <video
                        autoPlay
                        playsInline
                        className={`w-32 h-24 object-cover rounded-lg border ${dark ? 'border-gray-700' : 'border-gray-300'} shadow-md`}
                        ref={(el) => {
                          if (el && peer.stream) el.srcObject = peer.stream;
                        }}
                      />
                      <div className="absolute bottom-1 left-1 right-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-white truncate text-center">
                        {peer.username}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`grid ${remotePeers.length === 0 ? 'grid-cols-1' : remotePeers.length === 1 ? 'grid-cols-2' : remotePeers.length <= 3 ? 'grid-cols-2' : 'grid-cols-3'} gap-4 w-full`}>
                {/* Local video */}
                <div className="relative">
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={`w-full h-full object-cover rounded-xl border ${dark ? 'border-gray-700' : 'border-gray-300'} shadow-lg ${blurBackground ? 'backdrop-blur-lg' : ''}`} 
                  />
                  <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg text-white">
                    You {!micOn && <MicOff className="w-4 h-4 inline ml-1 text-red-500" />}
                  </div>
                </div>

                {/* Remote videos */}
                {remotePeers.map(peer => (
                  <div 
                    key={peer.id} 
                    className="relative cursor-pointer" 
                    onClick={() => {
                      setFocusedPeer(peer);
                      setLayout('spotlight');
                    }}
                  >
                    <video
                      autoPlay
                      playsInline
                      className={`w-full h-full object-cover rounded-xl border ${dark ? 'border-gray-700' : 'border-gray-300'} shadow-lg ${blurBackground ? 'backdrop-blur-lg' : ''}`}
                      ref={(el) => {
                        if (el && peer.stream) el.srcObject = peer.stream;
                      }}
                    />
                    <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg text-white">
                      {peer.username}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <div className={`flex items-center gap-2 px-4 py-3 rounded-full ${dark ? 'bg-gray-800/90' : 'bg-white/90'} backdrop-blur-md shadow-lg border ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button 
                onClick={toggleMic} 
                className={`p-3 rounded-full ${micOn ? (dark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800') : 'bg-red-500 text-white'}`}
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={toggleCam} 
                className={`p-3 rounded-full ${camOn ? (dark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800') : 'bg-red-500 text-white'}`}
              >
                {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={toggleSpeaker} 
                className={`p-3 rounded-full ${speakerOn ? (dark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800') : 'bg-red-500 text-white'}`}
              >
                {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              
              <div className="h-8 w-px bg-gray-400/30 mx-1"></div>
              
              <button 
                onClick={startScreenShare} 
                className={`p-3 rounded-full ${dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
              >
                <Monitor className="w-5 h-5" />
              </button>
              
              <button 
                onClick={toggleChat} 
                className={`p-3 rounded-full ${showChat ? 'bg-purple-500 text-white' : (dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200')} relative`}
              >
                <MessageCircle className="w-5 h-5" />
                {unreadMessages > 0 && !showChat && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </button>
              
              <button 
                onClick={toggleBlurBackground} 
                className={`p-3 rounded-full ${blurBackground ? 'bg-purple-500 text-white' : (dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200')}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="4"></circle>
                </svg>
              </button>
              
              <div className="h-8 w-px bg-gray-400/30 mx-1"></div>
              
              <button 
                onClick={hangUp} 
                className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar panels */}
        {(showChat || showParticipants || showSettings) && (
          <div className={`w-80 border-l ${dark ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-200'} backdrop-blur-md absolute right-0 top-0 bottom-0 transition-all duration-300 ease-in-out`}>
            {/* Panel header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="font-medium">
                {showChat && "Chat"}
                {showParticipants && "Participants"}
                {showSettings && "Settings"}
              </h3>
              <button 
                onClick={() => {
                  setShowChat(false);
                  setShowParticipants(false);
                  setShowSettings(false);
                }}
                className="p-1 rounded-full hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Chat panel */}
            {showChat && (
              <div className="flex flex-col h-[calc(100%-57px)]">
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                >
                  {messages.map((m, i) => {
                    const isCurrentUser = m.user === username;
                    const isSystem = m.user === "System";
                    const color = isSystem ? "#999" : (userColors[m.user] || ensureUserColor(m.user));
                    const prevMsg = i > 0 ? messages[i-1] : null;
                    const showUserInfo = !isSystem && (!prevMsg || prevMsg.user !== m.user);
                    
                    if (isSystem) {
                      return (
                        <div key={i} className="flex justify-center animate-fade-in">
                          <div className={`text-xs py-1.5 px-4 rounded-full ${dark ? 'bg-gray-700/70 text-gray-300' : 'bg-gray-200/70 text-gray-600'} backdrop-blur-sm`}>
                            {m.text}
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={i} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        {!isCurrentUser && showUserInfo && (
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium mr-2 mt-1 flex-shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {m.user && m.user.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                        
                        <div className="max-w-[80%]">
                          {!isCurrentUser && showUserInfo && (
                            <div className="text-xs font-medium mb-1" style={{ color }}>
                              {m.user}
                            </div>
                          )}
                          <div className={`relative px-3.5 py-2.5 ${
                            isCurrentUser 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl rounded-tr-sm' 
                              : dark 
                                ? 'bg-gray-700/90 text-white rounded-2xl rounded-tl-sm' 
                                : 'bg-gray-200/90 text-gray-800 rounded-2xl rounded-tl-sm'
                            } shadow-sm`}
                          >
                            <div className="leading-tight">{m.text}</div>
                            <div className="text-xs opacity-70 text-right mt-1.5">
                              {m.time}
                            </div>
                          </div>
                        </div>
                        
                        {isCurrentUser && showUserInfo && (
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ml-2 mt-1 flex-shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {m.user && m.user.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {typing && (
                    <div className="flex items-center text-sm text-gray-400 italic animate-fade-in">
                      <div className="w-6 h-6 rounded-full bg-gray-600/30 flex items-center justify-center mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </div>
                      <div className="flex items-center">
                        {typing}
                        <span className="ml-1 flex">
                          <span className="h-1.5 w-1.5 bg-gray-400 rounded-full mr-0.5 animate-pulse"></span>
                          <span className="h-1.5 w-1.5 bg-gray-400 rounded-full mr-0.5 animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                          <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <form onSubmit={sendMessage} className="p-3 border-t border-gray-700/50">
                  <div className="relative group">
                    <input
                      className={`w-full px-4 py-3 pr-12 rounded-full ${
                        dark 
                          ? 'bg-gray-700/80 text-white border-gray-600/50 focus:border-purple-500/50' 
                          : 'bg-gray-100/80 text-gray-800 border-gray-300/50 focus:border-purple-500/30'
                        } border shadow-sm focus:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/30`}
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={onTyping}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <button 
                        type="submit"
                        className="p-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-md transition-all transform hover:scale-105 active:scale-95"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1.5 ml-2">
                    Press Enter to send
                  </div>
                </form>
              </div>
            )}
            
            {/* Participants panel */}
            {showParticipants && (
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className={`p-3 rounded-lg ${dark ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-between`}>
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full ${dark ? 'bg-purple-600' : 'bg-purple-500'} flex items-center justify-center text-white font-medium mr-3`}>
                        {username && username.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium">{username || 'You'} (You)</div>
                        <div className="text-xs opacity-70">Host</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!micOn && <MicOff className="w-4 h-4 text-red-500" />}
                      {!camOn && <VideoOff className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                  
                  {remotePeers.map(peer => (
                    <div key={peer.id} className={`p-3 rounded-lg ${dark ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-between`}>
                      <div className="flex items-center">
                        <div 
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium mr-3`}
                          style={{ backgroundColor: userColors[peer.username] || ensureUserColor(peer.username) }}
                        >
                          {peer.username && peer.username.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="font-medium">{peer.username || 'Guest'}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t border-gray-700">
                  <button 
                    onClick={copyRoomLink}
                    className={`flex items-center justify-center w-full py-2 px-4 rounded-lg ${dark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Invite Others
                  </button>
                </div>
              </div>
            )}
            
            {/* Settings panel */}
            {showSettings && (
              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm uppercase tracking-wider opacity-70">Layout</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => changeLayout('grid')}
                      className={`p-3 rounded-lg flex flex-col items-center ${layout === 'grid' ? 'bg-purple-500 text-white' : dark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                      Grid
                    </button>
                    <button 
                      onClick={() => {
                        if (remotePeers.length > 0) {
                          setFocusedPeer(remotePeers[0]);
                          changeLayout('spotlight');
                        } else {
                          toast.error('Need at least one participant for spotlight view');
                        }
                      }}
                      className={`p-3 rounded-lg flex flex-col items-center ${layout === 'spotlight' ? 'bg-purple-500 text-white' : dark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
                        <rect x="6" y="16" width="4" height="4"></rect>
                        <rect x="14" y="16" width="4" height="4"></rect>
                      </svg>
                      Spotlight
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-gray-700">
                  <h4 className="font-medium text-sm uppercase tracking-wider opacity-70">Video</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={blurBackground}
                          onChange={toggleBlurBackground}
                          className="sr-only peer"
                        />
                        <div className={`relative w-10 h-5 ${dark ? 'bg-gray-700' : 'bg-gray-300'} rounded-full peer peer-checked:bg-purple-500 transition-colors`}>
                          <div className="absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-all peer-checked:left-6"></div>
                        </div>
                        <span className="ml-3">Background blur</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-gray-700">
                  <h4 className="font-medium text-sm uppercase tracking-wider opacity-70">Audio</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={speakerOn}
                          onChange={toggleSpeaker}
                          className="sr-only peer"
                        />
                        <div className={`relative w-10 h-5 ${dark ? 'bg-gray-700' : 'bg-gray-300'} rounded-full peer peer-checked:bg-purple-500 transition-colors`}>
                          <div className="absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-all peer-checked:left-6"></div>
                        </div>
                        <span className="ml-3">Speaker</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-700">
                  <button 
                    onClick={toggleRecording}
                    className={`flex items-center justify-center w-full py-2 px-4 rounded-lg ${isRecording ? 'bg-red-500 text-white' : dark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${isRecording ? 'bg-white animate-pulse' : 'bg-red-500'} mr-2`}></span>
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
