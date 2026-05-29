import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Simple state in memory to preserve score modifiers if user wants simulation mode
let scoreModifiers: Record<string, number> = {
  voyagers: 0,
  stormbreakers: 0,
  keepers: 0,
  guardians: 0,
  raiders: 0,
  pathfinders: 0,
};

let activeEvents: any[] = [];
const tribeKeys = ["voyagers", "stormbreakers", "keepers", "guardians", "raiders", "pathfinders"];

const eventsPool = [
  { title: "Heʻe Nalu Challenge", description: "won the big wave surfing contest at Waimea Bay!", points: 25, type: "boost" },
  { title: "Hōlua Sledding", description: "shredded down the volcanic slopes with supreme courage!", points: 20, type: "boost" },
  { title: "Ocean Navigation", description: "successfully calculated the path using only the ancient stars!", points: 35, type: "boost" },
  { title: "Taro Harvest Ritual", description: "gathered the largest taro roots of the season!", points: 15, type: "boost" },
  { title: "Volcano Caldera Tribute", description: "offered sacred ohelo berries to appease Pele the Fire Goddess!", points: 40, type: "volcano" },
  { title: "Makahiki spear throw", description: "struck the target perfectly from 50 paces!", points: 30, type: "boost" },
  { title: "Cliff Diving", description: "completed a gravity-defying dive from the cliffs of Kaunolu!", points: 20, type: "boost" },
  { title: "Shark Covenant", description: "crafted a deep bond with the ocean's guardian spirits!", points: 30, type: "boost" },
];

// Seed initial modifiers so that scores aren't all 0 at first load if sheets returns 0
const resetModifiers = () => {
  scoreModifiers = {
    voyagers: Math.floor(Math.random() * 150) + 120,
    stormbreakers: Math.floor(Math.random() * 150) + 110,
    keepers: Math.floor(Math.random() * 150) + 130,
    guardians: Math.floor(Math.random() * 150) + 100,
    raiders: Math.floor(Math.random() * 150) + 95,
    pathfinders: Math.floor(Math.random() * 150) + 105,
  };
};
resetModifiers();

// Background simulator loop to add excitement! Updates modifiers slightly every 3 seconds
setInterval(() => {
  const luckyTribe = tribeKeys[Math.floor(Math.random() * tribeKeys.length)];
  const randomEvent = eventsPool[Math.floor(Math.random() * eventsPool.length)];
  
  // Add points
  scoreModifiers[luckyTribe] += randomEvent.points;

  // Track the event
  const newEvent = {
    id: Math.random().toString(36).substr(2, 9),
    title: randomEvent.title,
    description: `The ${luckyTribe.charAt(0).toUpperCase() + luckyTribe.slice(1)} ${randomEvent.description}`,
    tribeKey: luckyTribe,
    pointsChanged: randomEvent.points,
    timestamp: new Date().toLocaleTimeString(),
    type: randomEvent.type,
  };

  activeEvents.unshift(newEvent);
  if (activeEvents.length > 15) {
    activeEvents.pop();
  }
}, 4500);

// Proxy endpoints
app.get("/api/leaderboard", async (req, res) => {
  const simulateStr = req.query.simulate;
  const useSimulation = simulateStr === "true";

  try {
    // Fetch actual data from Google Sheets Macro (native fetch defaults to follow redirects)
    const response = await fetch("https://script.google.com/macros/s/AKfycbzhPeiylYD2-v67ri8cB57ocefz6K9jRE_I_At9b6u255Zp7xfAdTuMNjVfkL6iy4m2/exec");
    if (!response.ok) {
      throw new Error(`Google Macro status ${response.status}`);
    }
    const realData = (await response.json()) as any[];

    // Map and inject modifiers/points
    const tribes = realData.map((item) => {
      const key = item.tribe.toLowerCase().trim();
      const extPoints = Number(item.points) || 0;
      
      return {
        id: item.id,
        tribe: key,
        points: useSimulation ? extPoints + (scoreModifiers[key] || 0) : extPoints,
        color: item.color || null
      };
    });

    res.json({
      tribes,
      timestamp: Date.now(),
      isSimulated: useSimulation,
      activeEvent: activeEvents[0] || null,
      history: activeEvents.slice(0, 8),
    });
  } catch (error: any) {
    console.log("[Hawaiian Server Info] Sheet macro offline, serving local simulation state:", error.message);
    
    // Server-side fallback schema so user ALWAYS gets data even if offline / sheets down
    const fallbackTribes = tribeKeys.map((key, index) => ({
      id: index + 1,
      tribe: key,
      points: scoreModifiers[key] || 100,
    }));

    res.json({
      tribes: fallbackTribes,
      timestamp: Date.now(),
      isSimulated: true,
      activeEvent: activeEvents[0] || {
        id: "offline",
        title: "Spirit Wave Connection",
        description: "Connected to local ancestors (Offline Fallback Simulator Mode is active).",
        tribeKey: "voyagers",
        pointsChanged: 0,
        timestamp: "Now",
        type: "boost",
      },
      history: activeEvents.slice(0, 8),
      error: error.message
    });
  }
});

app.post("/api/leaderboard/reset", (req, res) => {
  resetModifiers();
  activeEvents = [{
    id: "reset",
    title: "Makahiki Festival Restarted",
    description: "The island elders called a grand reset. All tribe modifiers refreshed!",
    tribeKey: "keepers",
    pointsChanged: 0,
    timestamp: new Date().toLocaleTimeString(),
    type: "boost"
  }];
  res.json({ status: "success" });
});

// Setup Vite Dev Server / static asset routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Hawaii Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
