import React, { useState, useEffect } from "react";

export default function HomePage({ onContinue }) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Animation on load
  useEffect(() => {
    setIsLoaded(true);
  }, []);

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
      
      {/* Main content card */}
      <div 
        className={`z-10 bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl rounded-2xl p-8 w-[500px] text-center transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="flex justify-center mb-6">
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
        
        <h1 className="text-4xl font-bold mb-3 text-white bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">Welcome to VisionLink</h1>
        <p className="mb-8 text-gray-200 text-lg">Experience seamless video conversations with friends, family, and colleagues</p>
        
        <div className="space-y-5 mb-10">
          <div className={`flex items-center text-left text-gray-200 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="bg-purple-500/20 p-3 rounded-full mr-4 shadow-lg shadow-purple-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <div>
              <span className="font-medium">Secure Connections</span>
              <p className="text-sm text-gray-300 mt-0.5">End-to-end encrypted video calls</p>
            </div>
          </div>
          
          <div className={`flex items-center text-left text-gray-200 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="bg-purple-500/20 p-3 rounded-full mr-4 shadow-lg shadow-purple-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div>
              <span className="font-medium">Real-time Chat</span>
              <p className="text-sm text-gray-300 mt-0.5">Integrated messaging with notifications</p>
            </div>
          </div>
          
          <div className={`flex items-center text-left text-gray-200 transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="bg-purple-500/20 p-3 rounded-full mr-4 shadow-lg shadow-purple-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <div>
              <span className="font-medium">Screen Sharing</span>
              <p className="text-sm text-gray-300 mt-0.5">Present your work with one click</p>
            </div>
          </div>
          
          <div className={`flex items-center text-left text-gray-200 transition-all duration-700 delay-400 ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="bg-purple-500/20 p-3 rounded-full mr-4 shadow-lg shadow-purple-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="4"></circle>
              </svg>
            </div>
            <div>
              <span className="font-medium">Background Effects</span>
              <p className="text-sm text-gray-300 mt-0.5">Blur your background for privacy</p>
            </div>
          </div>
        </div>
        
        <div className={`transition-all duration-700 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <button
            onClick={onContinue}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl text-lg font-medium transition-all hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-purple-500/30"
          >
            Get Started
          </button>
          
          <p className="mt-6 text-sm text-gray-300">
            By continuing, you agree to our <a href="#" className="text-purple-300 hover:text-purple-200 underline">Terms of Service</a> and <a href="#" className="text-purple-300 hover:text-purple-200 underline">Privacy Policy</a>
          </p>
        </div>
      </div>
      
      {/* Version tag */}
      <div className="absolute bottom-4 right-4 text-xs text-white/40">
        ConnectNow v1.0.0
      </div>
    </div>
  );
}
