/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Info, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Award,
  Flame,
  Zap,
  Ship,
  CloudLightning,
  Trees,
  Shield,
  Compass,
  Sparkle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Tribe, TribeConfig, IslandEvent } from './types';
import { HAWAIIAN_TRIBES_MAP, FALLBACK_TRIBES } from './tribeData';
const bannerImg = "/src/assets/images/hawaiian_sunset_banner_1780084132755.png";
import { islandAudio } from './utils/audio';

const WITTY_DESCRIPTIONS: Record<string, string> = {
  voyagers: "GPS is for amateurs. They steer 20-ton canoes using nothing but the alignment of stars and sheer oceanic intuition. Don't ask them for directions to Walmart, though.",
  stormbreakers: "Why wait for weather forecasts when you can harness a typhoon for high-voltage adrenaline surfing? Often seen arguing with clouds and daring lightning to strike twice.",
  keepers: "They guard sandalwood forests and sweet taro valleys like a helicopter parent. If you step on a leaf wrong, they'll write you a ticket in ancient Hawaiian lava ink.",
  guardians: "Extremely chill turtle defense squad. They shield turquoise lagoons like underwater security guards, but move at a maximum speed of 2 mph unless snacks are spotted.",
  raiders: "The hotheads of Madame Pele's volcanic core. They cook their dinner in active liquid lava and use molten basalt as their morning skin-exfoliant.",
  pathfinders: "These guys literally use the sunrise to calculate their tax bracket. Equipped with compass-minds that run circles around your modern mapping apps."
};

// Dynamic Icon Renderer
const TribeIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  switch (iconName) {
    case "Ship": return <Ship className={className} />;
    case "CloudLightning": return <CloudLightning className={className} />;
    case "Trees": return <Trees className={className} />;
    case "Shield": return <Shield className={className} />;
    case "Flame": return <Flame className={className} />;
    case "Compass": return <Compass className={className} />;
    default: return <Sparkles className={className} />;
  }
};

interface ScoreBubble {
  id: string;
  tribeKey: string;
  amount: number;
}

const getTribeBgClass = (configColor: string, fetchedColor?: string | null): string => {
  if (fetchedColor) {
    const clean = fetchedColor.trim();
    if (clean.includes('from-') || clean.includes('to-') || clean.includes('bg-')) {
      return clean;
    }
  }
  return `bg-gradient-to-tr ${configColor}`;
};

const getTribeProgressBarClass = (configColor: string, fetchedColor?: string | null): string => {
  if (fetchedColor) {
    const clean = fetchedColor.trim();
    if (clean.includes('from-') || clean.includes('to-') || clean.includes('bg-')) {
      // Return custom gradient and replace layout context direction if need be
      return clean.replace('bg-gradient-to-tr', 'bg-gradient-to-r');
    }
  }
  return `bg-gradient-to-r ${configColor}`;
};

const getTribeVerticalBgClass = (configColor: string, fetchedColor?: string | null): string => {
  if (fetchedColor) {
    const clean = fetchedColor.trim();
    if (clean.includes('from-') || clean.includes('to-') || clean.includes('bg-')) {
      if (!clean.includes('bg-gradient-to-')) {
        return `bg-gradient-to-t ${clean}`;
      }
      return clean.replace(/bg-gradient-to-(r|tr|l|b)/, 'bg-gradient-to-t');
    }
  }
  return `bg-gradient-to-t ${configColor}`;
};

const getTribeBgStyles = (fetchedColor?: string | null): CSSProperties => {
  if (fetchedColor) {
    const clean = fetchedColor.trim();
    if (clean.startsWith('#') || clean.startsWith('rgb') || (!clean.includes(' ') && !clean.includes('bg-') && !clean.includes('from-') && !clean.includes('to-'))) {
      return { backgroundColor: clean, backgroundImage: 'none' };
    }
  }
  return {};
};

interface FloatingParticle {
  id: number;
  image: string;
  left: string;
  size: number;
  duration: number;
  delay: number;
  rotateFrom: number;
  rotateTo: number;
}

const customFloatingParticles: FloatingParticle[] = Array.from({ length: 16 }, (_, idx) => {
  const images = [
    "/tribes/Asset_1.png",
    "/tribes/Asset_3.png",
    "/tribes/Asset_4.png",
    "/tribes/Asset_5.png",
    "/tribes/Asset_6.png",
    "/tribes/Asset_7.png",
    "/tribes/Asset_8.png",
    "/tribes/Asset_9.png",
    "/tribes/Asset_10.png",
    "/tribes/Asset_11.png",
    "/tribes/Asset_12.png",
    "/tribes/Asset_13.png"
  ];
  return {
    id: idx,
    image: images[idx % images.length],
    left: `${(idx * 6.25) + (Math.random() * 3.5)}%`, // nicely distributed across width
    size: 45 + Math.random() * 40, // 45px to 85px
    duration: 18 + Math.random() * 14, // 18s to 32s traversal time
    delay: -1 * (Math.random() * 32), // negative delay so they start scattered on mount
    rotateFrom: Math.random() * 360,
    rotateTo: Math.random() * 360 + (Math.random() > 0.5 ? 240 : -240)
  };
});

export default function App() {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [prevRanks, setPrevRanks] = useState<Record<string, number>>({});
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [activeEvent, setActiveEvent] = useState<IslandEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<IslandEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Audio & Interactive UI State
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [selectedTribe, setSelectedTribe] = useState<TribeConfig | null>(null);
  const [scoreBubbles, setScoreBubbles] = useState<ScoreBubble[]>([]);
  const [countdown, setCountdown] = useState<number>(3); // 3 seconds refresh
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  
  // Keep tracking first place to trigger conch beat on leader changes
  const prevFirstPlaceRef = useRef<string | null>(null);

  // Fetch Leaderboard Action
  const fetchLeaderboard = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?simulate=${isSimulated}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      let data = await res.json();
      
      // If client requests live web data, but the backend returned simulated or fallback due to server error,
      // invoke the doGet method directly from the browser as a robust direct-feed bypass!
      if (!isSimulated && (data.isSimulated || data.error)) {
        try {
          console.log("Invoking Google doGet method directly from browser...");
          const directRes = await fetch("https://script.google.com/macros/s/AKfycbzhPeiylYD2-v67ri8cB57ocefz6K9jRE_I_At9b6u255Zp7xfAdTuMNjVfkL6iy4m2/exec");
          if (directRes.ok) {
            const rawData = await directRes.json() as any[];
            data.tribes = rawData.map((item: any) => ({
              id: item.id,
              tribe: item.tribe.toLowerCase().trim(),
              points: Number(item.points) || 0,
              color: item.color || null
            }));
            data.isSimulated = false;
            data.error = undefined;
          }
        } catch (directErr: any) {
          console.warn("Direct browser fetch to Google Sheet macro failed:", directErr);
        }
      }
      
      const newTribes = data.tribes as Tribe[];
      const sortedNew = [...newTribes].sort((a, b) => b.points - a.points);
      
      // Determine Rank Changes
      const currentRanks: Record<string, number> = {};
      sortedNew.forEach((t, idx) => {
        currentRanks[t.tribe] = idx + 1;
      });

      // Sound trigger logic
      if (tribes.length > 0) {
        // Did first place change?
        const currentFirstPlace = sortedNew[0]?.tribe;
        if (prevFirstPlaceRef.current && prevFirstPlaceRef.current !== currentFirstPlace) {
          islandAudio.playConchDrum();
        } else {
          // Normal success refresh sound
          islandAudio.playTriumphChime();
        }
        prevFirstPlaceRef.current = currentFirstPlace;
      } else {
        prevFirstPlaceRef.current = sortedNew[0]?.tribe || null;
      }

      setTribes(newTribes);
      setActiveEvent(data.activeEvent);
      if (data.history) setEventHistory(data.history);
      setError(null);
    } catch (err: any) {
      console.warn("Failed fetching server leaderboard, invoking direct Google Sheets doGet connection:", err);
      try {
        const directRes = await fetch("https://script.google.com/macros/s/AKfycbzhPeiylYD2-v67ri8cB57ocefz6K9jRE_I_At9b6u255Zp7xfAdTuMNjVfkL6iy4m2/exec");
        if (directRes.ok) {
          const rawData = await directRes.json() as any[];
          const mapped = rawData.map((item: any) => ({
            id: item.id,
            tribe: item.tribe.toLowerCase().trim(),
            points: Number(item.points) || 0,
            color: item.color || null
          }));
          setTribes(mapped);
          setError(null);
        } else {
          handleClientFallback();
        }
      } catch (directErr) {
        handleClientFallback();
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Safe client-side fallback state generator in case of network disruptions
  const handleClientFallback = () => {
    setTribes((prev) => {
      const base = prev.length > 0 ? prev : FALLBACK_TRIBES.map(t => ({ ...t }));
      const updated = base.map(t => {
        // Slight points change
        const change = Math.floor(Math.random() * 15);
        return {
          ...t,
          points: t.points + (Math.random() > 0.65 ? change : 0)
        };
      });
      return updated;
    });
    
    // Auto populate random client-side event sometimes
    if (Math.random() > 0.5) {
      const luckyKeys = Object.keys(HAWAIIAN_TRIBES_MAP);
      const luckyKey = luckyKeys[Math.floor(Math.random() * luckyKeys.length)];
      const randomEvent: IslandEvent = {
        id: Math.random().toString(),
        title: "Wave Blessing",
        description: `Local ancestors favored the ${HAWAIIAN_TRIBES_MAP[luckyKey].name} with tropical trades winds.`,
        tribeKey: luckyKey,
        pointsChanged: 10,
        timestamp: new Date().toLocaleTimeString(),
        type: "boost"
      };
      setActiveEvent(randomEvent);
      setEventHistory(prev => [randomEvent, ...prev.slice(0, 10)]);
    }
    setError(null);
    setLoading(false);
  };

  // Timer: Auto-refresh countdown every 1 second
  useEffect(() => {
    const freshTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Fetch now
          fetchLeaderboard(false);
          return 3; // Reset timer
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(freshTimer);
  }, [isSimulated, tribes]);

  // Fetch on component mount and whenever isSimulated is toggled
  useEffect(() => {
    fetchLeaderboard(true);
  }, [isSimulated]);

  // Carousel auto-advance timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % 6);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  // Sync Audio Toggle with Sound Manager
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    islandAudio.setMute(nextMuted);

    // Play welcome wood pop to confirm audio unmuting
    if (!nextMuted) {
      islandAudio.playBambooClack(290, 0.2);
    }
  };

  // Trigger Local Casting / Blessing Activity (+10 dynamic points)
  const castBlessing = (tribeKey: string) => {
    // Play sweet bamboo clack with high resonant filter pitch (different per tribe)
    const pitch = 200 + (HAWAIIAN_TRIBES_MAP[tribeKey]?.id || 1) * 70;
    islandAudio.playBambooClack(pitch, 0.25);

    // Push local floating score bubble
    const bubbleId = Math.random().toString(36).substring(2, 9);
    const newBubble: ScoreBubble = {
      id: bubbleId,
      tribeKey,
      amount: 15
    };
    setScoreBubbles(prev => [...prev, newBubble]);

    // Update state locally first so user gets instant responsive UI pop
    setTribes((prev) =>
      prev.map((t) => (t.tribe === tribeKey ? { ...t, points: t.points + 15 } : t))
    );

    // Update active event
    const userEvent: IslandEvent = {
      id: bubbleId,
      title: "Tribal Prayer Ritual",
      description: `You offered dynamic coconut mana to the ${HAWAIIAN_TRIBES_MAP[tribeKey]?.name || tribeKey} (+15 pts!)`,
      tribeKey,
      pointsChanged: 15,
      timestamp: new Date().toLocaleTimeString(),
      type: "boost"
    };
    setActiveEvent(userEvent);
    setEventHistory(prev => [userEvent, ...prev.slice(0, 8)]);

    // Clear particle feedback bubble after 1 second
    setTimeout(() => {
      setScoreBubbles(prev => prev.filter(b => b.id !== bubbleId));
    }, 1200);
  };

  // Clear Game modifiers and start fresh
  const resetLeaderboard = async () => {
    islandAudio.playConchDrum();
    setEvents([]);
    try {
      await fetch("/api/leaderboard/reset", { method: "POST" });
      fetchLeaderboard(true);
    } catch {
      // Local Reset
      setTribes(FALLBACK_TRIBES.map(t => ({ ...t, points: Math.floor(Math.random()*40) + 10 })));
    }
  };

  const setEvents = (history: any) => {};

  // Sort and match configurations
  const sortedTribes = [...tribes].sort((a, b) => b.points - a.points);
  
  // Arrange top 3 for the beautiful physical podium layout: [Silver (#2), Gold (#1), Bronze (#3)]
  const podiumOrder: { tribeData: Tribe; config: TribeConfig; rank: number }[] = [];
  if (sortedTribes[1]) {
    podiumOrder.push({
      tribeData: sortedTribes[1],
      config: HAWAIIAN_TRIBES_MAP[sortedTribes[1].tribe],
      rank: 2
    });
  }
  if (sortedTribes[0]) {
    podiumOrder.push({
      tribeData: sortedTribes[0],
      config: HAWAIIAN_TRIBES_MAP[sortedTribes[0].tribe],
      rank: 1
    });
  }
  if (sortedTribes[2]) {
    podiumOrder.push({
      tribeData: sortedTribes[2],
      config: HAWAIIAN_TRIBES_MAP[sortedTribes[2].tribe],
      rank: 3
    });
  }

  // Calculate highest points to auto-scale indicator progress bars
  const maxPoints = Math.max(...tribes.map(t => t.points), 1);

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#3D3D3D] flex flex-col font-sans selection:bg-[#D48166]/30 selection:text-[#2D3025] relative overflow-hidden">
      
      {/* Decorative organic color shapes matching the 'Natural Tones' theme */}
      <div className="absolute top-0 right-0 w-[42rem] h-[40rem] bg-[#5A5A40] opacity-[0.05] rounded-full pointer-events-none -mr-96 -mt-96 z-0" />
      <div className="absolute bottom-0 left-0 w-[50rem] h-[48rem] bg-[#829175] opacity-[0.04] rounded-full pointer-events-none -ml-96 -mb-96 z-0" />

      {/* Floating Transparent Tribe Assets Animation (50% opacity, bottom to top) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {customFloatingParticles.map((pt) => (
          <motion.img
            key={pt.id}
            src={pt.image}
            alt=""
            className="absolute select-none pointer-events-none"
            referrerPolicy="no-referrer"
            style={{
              left: pt.left,
              width: `${pt.size}px`,
              height: `${pt.size}px`,
              opacity: 0.5,
              bottom: "-100px",
            }}
            animate={{
              y: ["0px", "-135vh"],
              rotate: [pt.rotateFrom, pt.rotateTo],
            }}
            transition={{
              duration: pt.duration,
              repeat: Infinity,
              ease: "linear",
              delay: pt.delay,
            }}
          />
        ))}
      </div>
      
      {/* 1. TROPICAL OCEAN sunset header BANNER */}
      <div id="hero-header" className="relative w-full h-[320px] sm:h-[360px] md:h-[400px] overflow-hidden shadow-sm border-b border-[#EBE8DF] z-10">
        
        {/* Soft elegant atmospheric sand overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F9F7F2]/10 to-[#F9F7F2]/80 z-10 pointer-events-none" />
        
        {/* Actual Generated Hawaiian Sunset Picture! */}
        <img 
          src={bannerImg} 
          alt="Beautiful Hawaiian Tropical Sunset Banner" 
          className="absolute inset-0 w-full h-full object-cover scale-[1.01] hover:scale-105 duration-[4s] transition-transform ease-out opacity-90" 
          referrerPolicy="no-referrer"
        />

        {/* Floating Abstract Volcanic Mist layer */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#F9F7F2] via-[#F9F7F2]/90 to-transparent z-10 pointer-events-none" />

        {/* Dashboard Control Buttons & UI */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
          
          {/* Mute Synthesizer Controller */}
          <button 
            id="sound-opt-btn"
            onClick={toggleMute}
            className={`cursor-pointer px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all duration-300 transform active:scale-95 ${
              isMuted 
                ? 'bg-white/80 backdrop-blur text-[#5A5A40] border border-[#EBE8DF]/50 hover:bg-white shadow-sm' 
                : 'bg-[#D48166] text-white shadow-sm shadow-[#D48166]/20 hover:bg-[#c57157] font-semibold'
            }`}
            title={isMuted ? "Unmute ancient tribal chimes" : "Mute environmental audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isMuted ? "Sound Off" : "Sound Live"}</span>
          </button>

          {/* Refresh Timer Widget */}
          <div className="bg-white/85 backdrop-blur-md px-3.5 py-2 rounded-xl flex items-center gap-2.5 border border-[#EBE8DF]/50 shadow-sm">
            <div className="relative w-4 h-4 flex items-center justify-center">
              <motion.div 
                className="absolute inset-0 rounded-full border-2 border-[#5A5A40]/20 border-t-[#D48166]"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
              <span className="text-[10px] font-mono font-black text-[#D48166]">{countdown}</span>
            </div>
            <span className="text-xs font-mono font-medium tracking-wide text-[#5A5A40]">REFRESH</span>
          </div>

          {/* Reset Makahiki Trigger */}
          <button 
            id="reset-leaderboard-btn"
            onClick={resetLeaderboard}
            className="cursor-pointer p-2 bg-white/80 hover:bg-[#F0EEE6] text-[#3D3D3D] rounded-xl border border-[#EBE8DF]/50 transition-all duration-200 active:scale-90 shadow-sm"
            title="Reset Tribal Match modifiers"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Island branding headers */}
        <div className="absolute bottom-6 left-4 right-4 sm:left-8 sm:right-8 z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="max-w-xl">
            <span className="bg-[#D48166]/10 border border-[#D48166]/35 text-[#D48166] text-[11px] font-bold tracking-widest px-3 py-1 rounded-full uppercase">
              🏝️ Summer Surge 2026
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black mt-2.5 tracking-tight text-[#2D3025]">
              Kinettix Tribal Games
            </h1>
          </div>


        </div>
      </div>

      {/* ERROR MESSAGE BAR */}
      {error && (
        <div className="mx-4 sm:mx-8 mt-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-red-800 text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <span>⚠️</span>
            <span>Failed loading official sheets. Seamless local simulator model active.</span>
          </div>
          <button onClick={() => setError(null)} className="hover:bg-red-100 p-1.5 rounded-lg text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN BODY LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* LEFT COLUMN: THE PODIUM & DETAILS GRID (8 COLS ON DESKTOP) */}
        <section className="lg:col-span-8 flex flex-col gap-8">
          
          {/* THE HIGHEST CRAFTSMANSHIP ANIMATING PODIUM */}
          <div id="podium-card" className="bg-slate-900/40 border border-slate-900/80 rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col relative overflow-hidden backdrop-blur-md">
            
            {/* Soft background lava volcanic light reflection */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5.5 h-5.5 text-amber-400" />
                <h2 className="font-bold text-lg tracking-tight text-amber-50">Tribal Council Podium</h2>
              </div>
      
            </div>

            {loading && tribes.length === 0 ? (
              // Loading Shimmer screen
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
                <span className="text-slate-400 text-sm font-medium font-mono">Summoning spirits...</span>
              </div>
            ) : (
              // The real floating column podium
              <div className="flex items-end justify-center gap-3 sm:gap-6 md:gap-8 h-[310px] pt-4 select-none">
                <AnimatePresence mode="popLayout">
                  {podiumOrder.map(({ tribeData, config, rank }) => {
                    if (!config) return null;

                    // Match height based on podium position: Gold (1st) > Silver (2nd) > Bronze (3rd)
                    const heightClass = 
                      rank === 1 ? 'h-[190px] sm:h-[220px]' : 
                      rank === 2 ? 'h-[140px] sm:h-[170px]' : 
                      'h-[110px] sm:h-[135px]';

                    const borderTheme = 
                      rank === 1 ? 'border-amber-400/40 shadow-amber-500/10' : 
                      rank === 2 ? 'border-blue-400/25 shadow-blue-500/5' : 
                      'border-emerald-500/15 shadow-emerald-500/5';

                    return (
                      <motion.div
                        key={config.key}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 110, 
                          damping: 15,
                          layout: { duration: 0.6 }
                        }}
                        className="flex flex-col items-center flex-1 max-w-[170px] text-center"
                      >
                        {/* Tribe Avatar Floating Sphere */}
                        <div className="relative mb-2">
                          
                          {/* Floating Particles/Bubbles container */}
                          <div className="absolute inset-0 pointer-events-none">
                            {scoreBubbles
                              .filter(b => b.tribeKey === config.key)
                              .map(b => (
                                <motion.div
                                  key={b.id}
                                  initial={{ y: 0, x: (Math.random() - 0.5) * 20, opacity: 1, scale: 0.5 }}
                                  animate={{ y: -70, opacity: 0, scale: 1.2 }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="absolute top-0 left-4 text-[#D48166] font-bold font-mono text-sm sm:text-base whitespace-nowrap z-30"
                                >
                                  +{b.amount} 🥥
                                </motion.div>
                              ))
                            }
                          </div>

                          {/* Leader Halo Ring */}
                          <div className={`p-1 rounded-full ${getTribeBgClass(config.color, tribeData.color)} shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer`}
                            style={getTribeBgStyles(tribeData.color)}
                            onClick={() => setSelectedTribe(config)}
                            title={`View details for ${config.name}`}
                          >
                            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center overflow-hidden rounded-full bg-white/90">
                              <img 
                                src={config.logoUrl} 
                                alt={config.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>

                          {/* Position Badge Badge */}
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-black border tracking-wide ${
                            rank === 1 ? 'bg-[#D48166] text-white border-[#EBE8DF]' :
                            rank === 2 ? 'bg-[#829175] text-white border-[#EBE8DF]' :
                            'bg-[#A39E8D] text-white border-[#EBE8DF]'
                          }`}>
                            {rank}
                          </div>
                        </div>

                        {/* Name and point display */}
                        <div className="mb-2">
                          <span className="block font-bold mt-1 text-xs sm:text-sm tracking-tight text-[#2D3025] truncate max-w-[120px]">
                            {tribeData.tribe.toUpperCase()}
                          </span>
                          <span className="text-xs sm:text-sm font-mono mt-0.5 font-bold block text-[#5A5A40]">
                            {tribeData.points} <span className="text-[10px] font-normal uppercase text-[#A39E8D]">PTS</span>
                          </span>
                        </div>

                        {/* Wood/Bamboo column podium section */}
                        <div 
                          className={`w-full ${heightClass} rounded-2xl border ${borderTheme} ${getTribeVerticalBgClass(config.color, tribeData.color)} flex flex-col justify-end p-2.5 sm:p-3 relative overflow-hidden shadow-sm`}
                          style={getTribeBgStyles(tribeData.color)}
                        >
                          {/* Animated glowing wave/liquid flow */}
                          <motion.div 
                            className="absolute inset-0 bg-gradient-to-t from-transparent via-white/25 to-transparent pointer-events-none"
                            animate={{
                              top: ["100%", "-100%"],
                            }}
                            transition={{
                              duration: 3.5,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />

                          {/* Dynamic subtle color/brightness pulse */}
                          <motion.div
                            className="absolute inset-0 bg-white opacity-0 mix-blend-overlay pointer-events-none"
                            animate={{
                              opacity: [0, 0.15, 0],
                            }}
                            transition={{
                              duration: 2.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />

                          {/* Bamboo horizontal rib accents */}
                          <div className="absolute inset-x-0 top-1/4 h-[1px] bg-white/15" />
                          <div className="absolute inset-x-0 top-2/4 h-[1px] bg-white/15" />
                          <div className="absolute inset-x-0 top-3/4 h-[1px] bg-white/15" />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* TRIBAL SHOWCASE CAROUSEL SECTION */}
          <div className="bg-white rounded-[32px] border border-[#EBE8DF] p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[280px]">
            {/* Elegant decorative border */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-[#D48166] via-[#829175] to-[#5A5A40]" />

            {/* Header Area */}
            <div className="flex items-center justify-between mb-4 border-b border-[#F0EEE6] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-[#D48166]" />
                <h3 className="font-serif font-bold text-base text-[#2D3025]">Tribal Council Broadcaster</h3>
              </div>
            </div>

            {/* Carousel Inner content with Chevron buttons */}
            <div className="relative flex-1 flex items-center min-h-[160px] my-2">
              {/* Left Arrow Button */}
              <button
                onClick={() => setCarouselIndex((prev) => (prev - 1 + 6) % 6)}
                className="cursor-pointer absolute left-0 md:-left-2 z-10 p-2 rounded-full bg-[#F9F7F2] hover:bg-[#D48166]/15 hover:text-[#D48166] text-[#5A5A40] border border-[#EBE8DF] transition-all duration-200 active:scale-90"
                title="Previous Tribe"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Slider content body */}
              <div className="w-full px-10 md:px-14">
                <AnimatePresence mode="wait">
                  {(() => {
                    const keys = ['voyagers', 'stormbreakers', 'keepers', 'guardians', 'raiders', 'pathfinders'];
                    const currentKey = keys[carouselIndex];
                    const config = HAWAIIAN_TRIBES_MAP[currentKey];
                    const wittyDesc = WITTY_DESCRIPTIONS[currentKey] || config.description;

                    return (
                      <motion.div
                        key={carouselIndex}
                        initial={{ opacity: 0, scale: 0.98, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -5 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 text-center md:text-left"
                      >
                        {/* Tribe Emblem Badge */}
                        <div className="flex-shrink-0 relative">
                          <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-2 border-white bg-gradient-to-br ${config.color} shadow-lg transition-transform hover:rotate-3 duration-300 relative overflow-hidden`}>
                            {/* Inner ambient shine */}
                            <div className="absolute inset-0 bg-white/10 mix-blend-overlay" />
                            {/* Big Logo Image if available, otherwise large Avatar text */}
                            {config.logoUrl ? (
                              <img 
                                src={config.logoUrl} 
                                alt={config.name} 
                                className="w-[70%] h-[70%] object-contain filter drop-shadow" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-4xl">{config.avatar}</span>
                            )}
                          </div>
                          {/* Rank indicator background dot */}
                          <div className="absolute -bottom-1.5 -right-1.5 bg-[#2D3025] text-[#F9F7F2] font-semibold text-xs border border-white rounded-full w-6.5 h-6.5 flex items-center justify-center font-mono">
                            {carouselIndex + 1}
                          </div>
                        </div>

                        {/* Title & Description Column */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2.5 justify-center md:justify-start">
                            <h4 className="font-serif font-black text-lg sm:text-xl text-[#2D3025] uppercase tracking-wide">
                              {currentKey.toUpperCase()}
                            </h4>
                            <span className="text-[10px] sm:text-xs font-semibold text-[#829175] uppercase px-2 py-0.5 rounded bg-[#829175]/8 border border-[#829175]/15 inline-block mx-auto sm:mx-0 self-center">
                              {config.element}
                            </span>
                          </div>

                          <p className="text-xs text-[#A39E8D] italic mt-1 font-medium tracking-wide">
                            {config.motto}
                          </p>

                          <p className="text-[#3D3D3D] text-xs sm:text-sm leading-relaxed mt-3.5 font-medium max-w-xl">
                            {wittyDesc}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>

              {/* Right Arrow Button */}
              <button
                onClick={() => setCarouselIndex((prev) => (prev + 1) % 6)}
                className="cursor-pointer absolute right-0 md:-right-2 z-10 p-2 rounded-full bg-[#F9F7F2] hover:bg-[#D48166]/15 hover:text-[#D48166] text-[#5A5A40] border border-[#EBE8DF] transition-all duration-200 active:scale-90"
                title="Next Tribe"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Pagination Bullet Indicators */}
            <div className="mt-4 pt-3 border-t border-[#F0EEE6] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[10px] text-[#A39E8D] font-mono uppercase tracking-wider">
                COUNCILS SELECTOR
              </span>

              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {['voyagers', 'stormbreakers', 'keepers', 'guardians', 'raiders', 'pathfinders'].map((key, idx) => {
                  const isActive = idx === carouselIndex;
                  return (
                    <button
                      key={key}
                      onClick={() => setCarouselIndex(idx)}
                      className={`cursor-pointer h-2.5 rounded-full transition-all duration-300 ${
                        isActive 
                          ? 'w-6 bg-[#D48166]' 
                          : 'w-2.5 bg-[#EBE8DF] hover:bg-[#A39E8D]'
                      }`}
                      title={`Go to ${key}`}
                    />
                  );
                })}
              </div>

              <span className="text-[10px] text-[#D48166] font-bold font-mono">
                {carouselIndex + 1} / 6 SECTS
              </span>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: DETAILED SCROLL list & SELECTIONS (4 COLS ON DESKTOP) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          
          {/* COMPLETE TRIBE LEADERSHIP SCROLL LIST */}
          <div className="bg-white rounded-[32px] border border-[#EBE8DF] p-6 flex flex-col shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F0EEE6] pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#D48166]" />
                <h3 className="font-serif font-bold text-base text-[#2D3025]">Tribal Master Rankings</h3>
              </div>
              <span className="text-xs text-[#A39E8D] font-mono font-semibold">6 SECTS</span>
            </div>

            <div className="space-y-3.5">
              {sortedTribes.map((tribeData, index) => {
                const config = HAWAIIAN_TRIBES_MAP[tribeData.tribe];
                if (!config) return null;

                const isLeader = index === 0;
                const pointsPercent = Math.min((tribeData.points / maxPoints) * 100, 100);

                return (
                  <motion.div
                    key={config.key}
                    layoutId={`rank-card-${config.key}`}
                    className={`p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer border hover:border-[#D48166]/20 active:scale-98 transition-all duration-200 ${
                      isLeader 
                        ? 'bg-gradient-to-r from-[#D48166]/10 to-[#FDFCF9] border-[#D48166]/30' 
                        : 'bg-[#FDFCF9] border-[#F0EEE6]'
                    }`}
                    onClick={() => {
                      setSelectedTribe(config);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left side details */}
                      <div className="flex items-center gap-3">
                        {/* Rank index */}
                        <div className={`w-6 h-6 rounded-lg font-serif italic text-xs font-bold flex items-center justify-center ${
                          index === 0 ? 'bg-[#D48166] text-white border border-[#D48166]' :
                          index === 1 ? 'bg-[#829175] text-white border border-[#829175]' :
                          index === 2 ? 'bg-[#A39E8D] text-white border border-[#A39E8D]' :
                          'text-[#5A5A40] bg-[#F0EEE6]'
                        }`}>
                          {index + 1}
                        </div>

                        {/* Tribe avatar + name */}
                        <div className="w-7 h-7 flex items-center justify-center overflow-hidden rounded-full bg-[#F0EEE6] border border-[#EBE8DF] shrink-0">
                          <img 
                            src={config.logoUrl} 
                            alt={config.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="text-sm font-serif font-bold text-[#2D3025] block truncate max-w-[130px] sm:max-w-none">
                          {tribeData.tribe.toUpperCase()}
                        </span>
                      </div>

                      {/* Right side points */}
                      <div className="text-right flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-serif font-black text-[#D48166]">
                            {tribeData.points}
                          </span>
                          <span className="text-[9px] text-[#A39E8D] uppercase font-bold tracking-wider">PTS</span>
                        </div>
                      </div>
                    </div>

                    {/* Proportional point progress bar */}
                    <div className="w-full h-1.5 bg-[#F0EEE6] rounded-full mt-3 overflow-hidden">
                      <motion.div 
                        className={`h-full ${getTribeProgressBarClass(config.color, tribeData.color)}`}
                        style={getTribeBgStyles(tribeData.color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${pointsPercent}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </section>
      </main>

      {/* DETAILED TRIBE DIALOG MODAL LAYOUT */}
      <AnimatePresence>
        {selectedTribe && (() => {
          const fetchedColor = tribes.find(t => t.tribe === selectedTribe.key)?.color || null;
          return (
            <div className="fixed inset-0 bg-[#2D3025]/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border border-[#EBE8DF] rounded-[32px] p-6 sm:p-8 max-w-lg w-full relative overflow-hidden shadow-xl text-[#3D3D3D]"
              >
                
                {/* Colored atmospheric backdrop glowing ring */}
                <div 
                  className={`absolute -top-24 -right-24 w-48 h-48 rounded-full ${getTribeBgClass(selectedTribe.color, fetchedColor)} opacity-10 blur-3xl pointer-events-none`} 
                  style={getTribeBgStyles(fetchedColor)}
                />

                {/* Close Button controller */}
                <button 
                  onClick={() => setSelectedTribe(null)}
                  className="cursor-pointer absolute top-4 right-4 p-2 hover:bg-[#F0EEE6] rounded-full text-[#829175] hover:text-[#2D3025] border border-[#EBE8DF]"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-4 mb-5 pb-4 border-b border-[#F0EEE6]">
                  <div 
                    className={`p-1.5 rounded-2xl ${getTribeBgClass(selectedTribe.color, fetchedColor)} shadow-sm`}
                    style={getTribeBgStyles(fetchedColor)}
                  >
                    <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-xl bg-white/95 shadow-sm">
                      <img 
                        src={selectedTribe.logoUrl} 
                        alt={selectedTribe.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-black text-[#2D3025]">{selectedTribe.name}</h3>
                    <span className="text-xs text-[#D48166] font-mono tracking-widest uppercase font-semibold">
                      Element: {selectedTribe.element}
                    </span>
                  </div>
                </div>

                {/* Motto Box */}
                <div className="bg-[#F9F7F2] p-4 rounded-2xl border border-[#F0EEE6] italic mb-4">
                  <span className="text-xs text-[#D48166]/80 font-mono uppercase block not-italic font-bold tracking-wider mb-2">
                    Sacred Chanted Motto
                  </span>
                  <p className="text-[#2D3025] text-sm leading-relaxed">&ldquo;{selectedTribe.motto}&rdquo;</p>
                </div>

                {/* Detailed Description */}
                <div className="space-y-4 text-xs sm:text-sm text-[#3D3D3D] leading-relaxed">
                  <p>{selectedTribe.description}</p>
                  <p>
                    As active champions in the volcano arena trials, they track celestial tides to coordinate surges of points and master the active volcanic tides of Madame Pele.
                  </p>
                </div>

                {/* Action trigger links */}
                <div className="mt-6 pt-4 border-t border-[#F0EEE6] flex justify-end">
                  <button
                    id="close-tribe-btn"
                    onClick={() => setSelectedTribe(null)}
                    className="cursor-pointer py-3 bg-[#F0EEE6] hover:bg-[#EBE8DF] text-[#5A5A40] hover:text-[#2D3025] rounded-2xl border border-[#EBE8DF] font-medium text-center text-xs w-full transition-all duration-200"
                  >
                    Return to Council
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* FOOTER METADATA */}
      <footer className="border-t border-[#EBE8DF] bg-white/70 py-6 text-center text-[#A39E8D] text-xs font-mono font-medium relative z-10">
        <span>© 2026 Hawaiian Makahiki Games Leaderboard Engine • Crafted in AI Studio</span>
      </footer>

    </div>
  );
}
