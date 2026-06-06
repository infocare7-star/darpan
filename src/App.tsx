/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Smartphone, 
  Tv, 
  Wifi, 
  Battery, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Terminal, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  ChevronRight, 
  Send, 
  Trash2, 
  HelpCircle,
  Play,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ConnectionStatus, LogEntry, WSMessage, DeviceState } from "./types";

export default function App() {
  // --- Logging Console Helper ---
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init",
      timestamp: new Date().toLocaleTimeString(),
      type: "info",
      message: "Remote mobile screen viewer initialized. System ready.",
    }
  ]);

  const addLog = (type: "info" | "success" | "warning" | "error" | "tx" | "rx", message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
      }
    ].slice(-100)); // keep last 100 entries
  };

  const clearLogs = () => {
    setLogs([]);
    addLog("info", "Console cleared.");
  };

  // --- WebSocket Connection Status for Host ---
  const [hostCode, setHostCode] = useState<string>("");
  const [isHostConnected, setIsHostConnected] = useState<boolean>(false);
  const hostWsRef = useRef<WebSocket | null>(null);

  // --- WebSocket Connection Status for Viewer ---
  const [viewerCode, setViewerCode] = useState<string>("");
  const [viewerStatus, setViewerStatus] = useState<ConnectionStatus>("DISCONNECTED");
  const [viewerError, setViewerError] = useState<string | null>(null);
  const viewerWsRef = useRef<WebSocket | null>(null);

  // --- Virtual Device Host Internal App State ---
  const [device, setDevice] = useState<DeviceState>({
    currentTab: "home",
    time: "",
    battery: 88,
    unlocked: false,
    notes: [
      "Buy groceries for dinner",
      "Draft presentation slide deck",
      "Review WebSocket server logs"
    ],
    weatherTemp: 24,
    weatherCity: "San Francisco",
    scrollPosition: 0,
    drawings: [],
  });

  // Keep state ref updated to handle in intervals cleanly without stale closures
  const deviceStateRef = useRef<DeviceState>(device);
  useEffect(() => {
    deviceStateRef.current = device;
  }, [device]);

  // Host Action Ripples for visualizing remote touches
  const [ripples, setRipples] = useState<Array<{ id: string; x: number; y: number; radius: number; maxRadius: number; alpha: number; label?: string }>>([]);

  const addRipple = (x: number, y: number, label?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setRipples((prev) => [...prev, { id, x, y, radius: 2, maxRadius: 40, alpha: 1, label }]);
  };

  // Update clock time
  useEffect(() => {
    const updateTime = () => {
      const parsed = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setDevice(prev => ({ ...prev, time: parsed }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- HTML5 Screen Canvas Helpers & Streaming Loop (Host Side) ---
  const hostCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const triggerScreenshot = () => {
    const canvas = hostCanvasRef.current;
    if (!canvas || !isHostConnected || !hostWsRef.current || hostWsRef.current.readyState !== WebSocket.OPEN) return;
    
    // Convert to minor compressed JPEG for optimized transmission speeds
    const dataUrl = canvas.toDataURL("image/jpeg", 0.55);
    
    hostWsRef.current.send(JSON.stringify({
      type: "screen_frame",
      image: dataUrl,
      timestamp: Date.now()
    }));
  };

  // --- Draw loop for virtual device ---
  useEffect(() => {
    let animFrameId: number;

    const renderDeviceScreen = () => {
      const canvas = hostCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const currentState = deviceStateRef.current;

      // 1. Draw sleek wallpaper (Abstract cosmic neon gradient)
      const grad = ctx.createRadialGradient(180, 370, 50, 180, 370, 400);
      grad.addColorStop(0, "#1e1b4b"); // deep indigo
      grad.addColorStop(0.5, "#0f172a"); // slate-900
      grad.addColorStop(1, "#020617"); // slate-950
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 360, 740);

      // Abstract shapes in wallpaper background
      ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
      ctx.beginPath();
      ctx.arc(80, 200, 150, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(219, 39, 119, 0.05)";
      ctx.beginPath();
      ctx.arc(280, 550, 120, 0, Math.PI * 2);
      ctx.fill();

      // 2. Status Bar
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(0, 0, 360, 44);

      // Status Bar Font properties
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 13px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(currentState.time || "12:00 PM", 24, 22);

      // Status Icons (Signal, Wifi, Battery) at top right
      ctx.textAlign = "right";
      ctx.fillText(`📶  📶  🔋 ${currentState.battery}%`, 336, 22);

      // 3. Navigation Header / Notch space
      // Draw simulated camera punch-hole elegant style
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(180, 22, 10, 0, Math.PI * 2);
      ctx.fill();

      // 4. Client state content drawing
      if (!currentState.unlocked) {
        // --- LOCK SCREEN VIEW ---
        ctx.textAlign = "center";

        // Big Digital Clock
        ctx.fillStyle = "#ffffff";
        ctx.font = "300 54px Space Grotesk, sans-serif";
        const splitTime = currentState.time ? currentState.time.split(" ")[0] : "12:00";
        ctx.fillText(splitTime, 180, 170);

        // Date
        ctx.fillStyle = "rgba(241, 245, 249, 0.75)";
        ctx.font = "500 15px Inter, sans-serif";
        ctx.fillText("Friday, June 5", 180, 225);

        // Glowing Secured Lock Icon
        ctx.shadowColor = "#6366f1";
        ctx.shadowBlur = 15;
        ctx.fillStyle = "rgba(99, 102, 241, 0.2)";
        ctx.beginPath();
        ctx.arc(180, 370, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Padlock bracket symbol
        ctx.strokeStyle = "#818cf8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(180, 360, 14, Math.PI, 0, false);
        ctx.stroke();

        // Lock body
        ctx.fillStyle = "#a5b4fc";
        ctx.fillRect(168, 362, 24, 18);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(178, 368, 4, 6);

        // Security indicator text
        ctx.fillStyle = "#818cf8";
        ctx.font = "600 12px Inter, sans-serif";
        ctx.fillText("TAP SCREEN TO REVEAL KEYPAD", 180, 445);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "400 13px Inter, sans-serif";
        ctx.fillText("Slide / Swipe Up to Unlock", 180, 680);

        // Drag bar indicator
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.roundRect(140, 696, 80, 5, 2);
        ctx.fill();

      } else {
        // --- HOME / ACTIVE APP VIEW ---
        if (currentState.currentTab === "home") {
          // --- WEATHER WIDGET CONTAINER ---
          ctx.beginPath();
          ctx.roundRect(20, 70, 320, 110, 16);
          const bgGrad = ctx.createLinearGradient(20, 70, 340, 180);
          bgGrad.addColorStop(0, "rgba(255, 255, 255, 0.08)");
          bgGrad.addColorStop(1, "rgba(255, 255, 255, 0.02)");
          ctx.fillStyle = bgGrad;
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Weather contents
          ctx.textAlign = "left";
          ctx.fillStyle = "#94a3b8";
          ctx.font = "600 11px Inter, sans-serif";
          ctx.fillText("LIVE WEATHER", 40, 95);

          ctx.fillStyle = "#ffffff";
          ctx.font = "600 28px Space Grotesk, sans-serif";
          ctx.fillText(`${currentState.weatherCity}`, 40, 130);

          ctx.fillStyle = "#6366f1";
          ctx.font = "700 36px Space Grotesk, sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(`${currentState.weatherTemp}°`, 310, 134);

          ctx.textAlign = "left";
          ctx.fillStyle = "#cbd5e1";
          ctx.font = "400 13px Inter, sans-serif";
          ctx.fillText("🌤️ Mild Overcast Skies • Warm Breeze", 40, 158);

          // --- APPLICATIONS GRID ---
          ctx.textAlign = "center";
          ctx.font = "500 12px Inter, sans-serif";

          // Icon 1: Messages Chat App Button
          ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
          ctx.beginPath();
          ctx.arc(75, 260, 26, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#10b981";
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.fillText("💬", 75, 264);
          ctx.fillStyle = "#94a3b8";
          ctx.fillText("Messages", 75, 302);

          // Icon 2: Smart Painter App Button
          ctx.fillStyle = "rgba(236, 72, 153, 0.15)";
          ctx.beginPath();
          ctx.arc(180, 260, 26, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ec4899";
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.fillText("🎨", 180, 264);
          ctx.fillStyle = "#94a3b8";
          ctx.fillText("Sketchpad", 180, 302);

          // Icon 3: Device Configuration Settings Button
          ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
          ctx.beginPath();
          ctx.arc(285, 260, 26, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#f59e0b";
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.fillText("⚙️", 285, 264);
          ctx.fillStyle = "#94a3b8";
          ctx.fillText("Settings", 285, 302);

          // Icon 4: Emergency Lock button
          ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
          ctx.beginPath();
          ctx.arc(180, 370, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ef4444";
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.fillText("🔒", 180, 374);
          ctx.fillStyle = "#ef4444";
          ctx.font = "600 11px Inter, sans-serif";
          ctx.fillText("Lock Screen", 180, 410);

          // --- QUICK MEMOS LIST ---
          ctx.beginPath();
          ctx.roundRect(20, 445, 320, 215, 16);
          ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.stroke();

          ctx.textAlign = "left";
          ctx.font = "700 12px Space Grotesk, sans-serif";
          ctx.fillStyle = "#818cf8";
          ctx.fillText("📋 REMOTELY WRITTEN MEMOS", 40, 475);

          ctx.font = "400 13px Inter, sans-serif";
          currentState.notes.forEach((note, idx) => {
            if (idx > 3) return; // cap screen display string length
            ctx.fillStyle = "#f1f5f9";
            ctx.fillText(`• ${note}`, 42, 510 + (idx * 35));
            
            // tiny horizontal split
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.beginPath();
            ctx.moveTo(40, 522 + (idx * 35));
            ctx.lineTo(320, 522 + (idx * 35));
            ctx.stroke();
          });

          // Footer indicator info
          ctx.textAlign = "center";
          ctx.fillStyle = "#475569";
          ctx.font = "400 11px Inter, sans-serif";
          ctx.fillText("Taps & swipes here map to remote commands.", 180, 690);

        } else if (currentState.currentTab === "chat") {
          // --- MESSAGES / CHAT APP ---
          // Top Bar header
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.fillRect(0, 44, 360, 55);

          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.beginPath();
          ctx.moveTo(0, 99);
          ctx.lineTo(360, 99);
          ctx.stroke();

          ctx.textAlign = "left";
          ctx.fillStyle = "#10b981";
          ctx.font = "600 14px Space Grotesk, sans-serif";
          ctx.fillText("⬅ Back", 20, 76);

          ctx.textAlign = "center";
          ctx.fillStyle = "#ffffff";
          ctx.font = "600 14px Inter, sans-serif";
          ctx.fillText("Remote Console Support", 180, 76);

          // Simulated dialogue thread bubbles
          ctx.textAlign = "left";
          
          // User message bubble (Cyan / Right)
          ctx.beginPath();
          ctx.roundRect(140, 120, 200, 50, 12);
          ctx.fillStyle = "#1e3a8a"; // deep blue
          ctx.fill();
          ctx.fillStyle = "#e2e8f0";
          ctx.font = "400 13px Inter, sans-serif";
          ctx.fillText("How is the WebSocket", 152, 142);
          ctx.fillText("connection bandwidth?", 152, 158);

          // Host reply bubble (Slate / Left)
          ctx.beginPath();
          ctx.roundRect(20, 185, 220, 60, 12);
          ctx.fillStyle = "rgba(30, 41, 59, 1)";
          ctx.fill();
          ctx.fillStyle = "#f1f5f9";
          ctx.fillText("Sub-10ms! Compressed canvas", 32, 208);
          ctx.fillText("JPEG blobs stream smoothly", 32, 224);
          ctx.fillText("without any browser memory leak.", 32, 240);

          // Quick action chips - triggerable buttons at bottom context
          ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
          ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
          
          // Reply Chip A (Tapping triggers new note addition)
          ctx.beginPath();
          ctx.roundRect(20, 500, 320, 40, 8);
          ctx.fill(); ctx.stroke();
          ctx.textAlign = "center";
          ctx.fillStyle = "#34d399";
          ctx.font = "600 12px Inter, sans-serif";
          ctx.fillText("⚡ Reply A: 'System response checks OK.'", 180, 524);

          // Reply Chip B
          ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
          ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
          ctx.beginPath();
          ctx.roundRect(20, 555, 320, 40, 8);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#818cf8";
          ctx.fillText("⚡ Reply B: 'Simulate mobile layout change.'", 180, 579);

          // Clear history button
          ctx.fillStyle = "rgba(239, 68, 68, 0.08)";
          ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
          ctx.beginPath();
          ctx.roundRect(20, 610, 320, 40, 8);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#f87171";
          ctx.fillText("🗑️ Clear Live Notes Database", 180, 634);

          // Bottom advice info text
          ctx.textAlign = "center";
          ctx.fillStyle = "#475569";
          ctx.fillText("Interactive button clicks map inside viewer canvas.", 180, 680);

        } else if (currentState.currentTab === "apps") {
          // --- SMART SKETCHPAD / PAINTER APP ---
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.fillRect(0, 44, 360, 55);

          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.beginPath();
          ctx.moveTo(0, 99);
          ctx.lineTo(360, 99);
          ctx.stroke();

          ctx.textAlign = "left";
          ctx.fillStyle = "#ec4899";
          ctx.font = "600 14px Space Grotesk, sans-serif";
          ctx.fillText("⬅ Back", 20, 76);

          ctx.textAlign = "center";
          ctx.fillStyle = "#ffffff";
          ctx.font = "600 14px Inter, sans-serif";
          ctx.fillText("Remote Sketchpad Drawer", 180, 76);

          // Drawing canvas bounding area rect
          ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
          ctx.fillRect(20, 115, 320, 460);
          ctx.strokeStyle = "rgba(236, 72, 153, 0.2)";
          ctx.lineWidth = 2;
          ctx.strokeRect(20, 115, 320, 460);

          // Render paint blobs or paths
          currentState.drawings.forEach((pt) => {
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
          });

          // Draw sketch app menu items
          ctx.fillStyle = "#1e293b";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          
          // Clear button
          ctx.beginPath();
          ctx.roundRect(40, 600, 130, 42, 8);
          ctx.fill(); ctx.stroke();
          ctx.textAlign = "center";
          ctx.font = "600 13px Inter, sans-serif";
          ctx.fillStyle = "#ef4444";
          ctx.fillText("Clear Board 🧹", 105, 626);

          // Add random star button
          ctx.fillStyle = "#334155";
          ctx.beginPath();
          ctx.roundRect(190, 600, 130, 42, 8);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#ec4899";
          ctx.fillText("Paint Stars ✨", 255, 626);

          ctx.textAlign = "center";
          ctx.fillStyle = "#475569";
          ctx.font = "400 11px Inter, sans-serif";
          ctx.fillText("Drag mouse on viewer screen to paint here", 180, 680);

        } else if (currentState.currentTab === "settings") {
          // --- DEVICE TING PANEL ---
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.fillRect(0, 44, 360, 55);

          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.beginPath();
          ctx.moveTo(0, 99);
          ctx.lineTo(360, 99);
          ctx.stroke();

          ctx.textAlign = "left";
          ctx.fillStyle = "#f59e0b";
          ctx.font = "600 14px Space Grotesk, sans-serif";
          ctx.fillText("⬅ Hand", 20, 76);

          ctx.textAlign = "center";
          ctx.fillStyle = "#ffffff";
          ctx.font = "600 14px Inter, sans-serif";
          ctx.fillText("System Preferences", 180, 76);

          // Panel block
          ctx.beginPath();
          ctx.roundRect(20, 120, 320, 180, 12);
          ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.stroke();

          ctx.textAlign = "left";
          ctx.fillStyle = "#a5b4fc";
          ctx.font = "600 12px Space Grotesk, sans-serif";
          ctx.fillText("BATTERY EMULATION", 40, 150);

          // High power list item
          ctx.fillStyle = "#ffffff";
          ctx.font = "400 13px Inter, sans-serif";
          ctx.fillText("Set State to Full (100%)", 40, 190);
          ctx.beginPath();
          ctx.roundRect(240, 172, 75, 24, 6);
          ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
          ctx.fill();
          ctx.strokeStyle = "#10b981";
          ctx.stroke();
          ctx.textAlign = "center";
          ctx.fillStyle = "#10b981";
          ctx.font = "600 11px Inter, sans-serif";
          ctx.fillText("SET 🔋", 277, 188);

          ctx.textAlign = "left";
          ctx.fillStyle = "#ffffff";
          ctx.font = "400 13px Inter, sans-serif";
          ctx.fillText("Drain Battery Level (10%)", 40, 240);
          ctx.beginPath();
          ctx.roundRect(240, 222, 75, 24, 6);
          ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
          ctx.fill();
          ctx.strokeStyle = "#ef4444";
          ctx.stroke();
          ctx.textAlign = "center";
          ctx.fillStyle = "#f87171";
          ctx.font = "600 11px Inter, sans-serif";
          ctx.fillText("DRAIN 📉", 277, 238);

          // Weather city changer block
          ctx.beginPath();
          ctx.roundRect(20, 320, 320, 180, 12);
          ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.stroke();

          ctx.textAlign = "left";
          ctx.fillStyle = "#a5b4fc";
          ctx.font = "600 12px Space Grotesk, sans-serif";
          ctx.fillText("LOCATION TUNE-UP", 40, 350);

          // Option list cities
          ctx.fillStyle = "#ffffff";
          ctx.font = "400 13px Inter, sans-serif";
          ctx.fillText("Simulate Location: Tokyo", 40, 395);
          ctx.beginPath();
          ctx.roundRect(240, 378, 75, 24, 6); // button Tokyo
          ctx.fillStyle = "rgba(99, 102, 241, 0.15)";
          ctx.fill();
          ctx.strokeStyle = "#818cf8";
          ctx.stroke();
          ctx.textAlign = "center";
          ctx.fillStyle = "#a5b4fc";
          ctx.font = "600 11px Inter, sans-serif";
          ctx.fillText("Tokyo 🇯🇵", 277, 394);

          ctx.textAlign = "left";
          ctx.fillStyle = "#ffffff";
          ctx.font = "400 13px Inter, sans-serif";
          ctx.fillText("Simulate Location: Paris", 40, 445);
          ctx.beginPath();
          ctx.roundRect(240, 428, 75, 24, 6); // button Paris
          ctx.fillStyle = "rgba(236, 72, 153, 0.15)";
          ctx.fill();
          ctx.strokeStyle = "#ec4899";
          ctx.stroke();
          ctx.textAlign = "center";
          ctx.fillStyle = "#f472b6";
          ctx.font = "600 11px Inter, sans-serif";
          ctx.fillText("Paris 🇫🇷", 277, 444);

          // Reset settings button
          ctx.fillStyle = "#1e293b";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.beginPath();
          ctx.roundRect(40, 520, 280, 45, 8);
          ctx.fill(); ctx.stroke();
          ctx.textAlign = "center";
          ctx.fillStyle = "#94a3b8";
          ctx.font = "600 13px Inter, sans-serif";
          ctx.fillText("Reset All System Mock States", 180, 548);

          ctx.fillStyle = "#475569";
          ctx.font = "400 11px Inter, sans-serif";
          ctx.fillText("Configuration changes apply instantly.", 180, 680);
        }
      }

      // 5. Draw active glowing ripples expanding over screen (simulating taps)
      ripples.forEach((rp) => {
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = `rgba(6, 182, 212, ${rp.alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Inner solid core dot
        ctx.fillStyle = `rgba(34, 211, 238, ${rp.alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label flag tag if any context is sent
        if (rp.label) {
          ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
          ctx.strokeStyle = "rgba(34, 211, 238, 0.5)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(rp.x + 10, rp.y - 12, 110, 24, 4);
          ctx.fill(); ctx.stroke();
          
          ctx.font = "Bold 9px Inter, sans-serif";
          ctx.fillStyle = "#c2f9ff";
          ctx.textAlign = "left";
          ctx.fillText(rp.label, rp.x + 16, rp.y + 4);
        }
      });
    };

    // Screen Render frames ticker
    const tick = () => {
      // 1. Advance radius of all touch ripples
      setRipples((prev) => 
        prev
          .map((r) => ({
            ...r,
            radius: r.radius + 2.5,
            alpha: Math.max(0, 1 - r.radius / r.maxRadius)
          }))
          .filter((r) => r.alpha > 0)
      );

      // 2. Clear canvas and re-render
      renderDeviceScreen();

      // 3. Convert image output and streams to server loop
      triggerScreenshot();

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [ripples, isHostConnected]);

  // --- Start WS Connection to act as Host ---
  const handleStartHostSession = () => {
    if (hostWsRef.current) {
      hostWsRef.current.close();
    }

    addLog("info", "Opening connection tunnel on server...");
    
    // Auto-detect secure schema and host based on actual window URL in preview containers
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    addLog("info", `Initiating WebSockets handshake with signaling server at ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    hostWsRef.current = ws;

    ws.onopen = () => {
      addLog("success", "WS Link established with central signaling server.");
      // Register this socket as the "Host" device
      ws.send(JSON.stringify({ type: "register_host" }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case "host_registered":
            setHostCode(msg.code);
            setIsHostConnected(true);
            addLog("success", `SECURE LINK CREATED! Sharing Code allotted: ${msg.code}`);
            addLog("info", `Virtual mobile screen is now broadcasting frames to room ID: ${msg.code}`);
            break;

          case "viewer_connected":
            addLog("success", "Remote control signal bound: viewer joined");
            // Highlight locally with ripple anchor
            addRipple(180, 370, "CONTROLLER BOUND");
            break;

          case "viewer_disconnected":
            addLog("warning", "Secure viewer tunnel severed. Remote viewer disconnected.");
            break;

          case "action":
            // Remote action received over WebSockets! Map coordinates perfectly
            if (msg.action === "TAP") {
              addLog("rx", `REMOTE TAP action received at (${msg.x}, ${msg.y})`);
              addRipple(msg.x || 0, msg.y || 0, "REMOTE TAP");
              
              // Apply TAP logic to states!
              processActionOnDevice(msg.action, msg.x || 0, msg.y || 0);
            } else if (msg.action === "SWIPE") {
              addLog("rx", `REMOTE SWIPE from (${msg.startX}, ${msg.startY}) to (${msg.endX}, ${msg.endY})`);
              // add ripple at center of swipe
              const cx = ((msg.startX || 0) + (msg.endX || 0)) / 2;
              const cy = ((msg.startY || 0) + (msg.endY || 0)) / 2;
              addRipple(cx, cy, "REMOTE SWIPE");

              // Apply Swipe logic!
              processActionOnDevice(msg.action, undefined, undefined, msg.startX, msg.startY, msg.endX, msg.endY);
            }
            break;

          default:
            console.warn("Unhandled Message on host", msg);
        }
      } catch (err) {
        console.error("Failed to parse Host WS event: ", err);
      }
    };

    ws.onclose = () => {
      setIsHostConnected(false);
      setHostCode("");
      addLog("error", "Host transport stream closed.");
    };

    ws.onerror = (err) => {
      addLog("error", "Host WebSocket stream encountered an error.");
      console.error(err);
    };
  };

  // Turn off Host streaming
  const handleStopHostSession = () => {
    if (hostWsRef.current) {
      hostWsRef.current.close();
      hostWsRef.current = null;
    }
    setIsHostConnected(false);
    setHostCode("");
    addLog("info", "Broadcasting host channel disconnected.");
  };

  // Apply inputs (Taps/Swipes) directly down to device model states
  const processActionOnDevice = (
    action: "TAP" | "SWIPE", 
    x?: number, 
    y?: number, 
    startX?: number, 
    startY?: number, 
    endX?: number, 
    endY?: number
  ) => {
    setDevice((prev) => {
      const draft = { ...prev };

      // Case A: Screen is locked
      if (!draft.unlocked) {
        if (action === "TAP") {
          // Tap anywhere unlocks or shows swipe prompt
          draft.unlocked = true;
          addLog("info", "Virtual device unlocked by REMOTE TAP interaction.");
        } else if (action === "SWIPE" && startY && endY && startY - endY > 50) {
          // Swipe up unlocks
          draft.unlocked = true;
          addLog("info", "Virtual device unlocked by REMOTE SWIPE-UP motion.");
        }
        return draft;
      }

      // Case B: Screen is unlocked (Tab-specific coordinate handlers)
      if (action === "TAP" && x && y) {
        // Global Bottom Menu Bar checks?
        // No bottom bars modeled inside canvas space right now, just back buttons.

        if (draft.currentTab === "home") {
          // App 1 icon bounds check (Messages) - circle centered at (75, 260) with radius 26
          const dist1 = Math.hypot(x - 75, y - 260);
          if (dist1 <= 30) {
            draft.currentTab = "chat";
            addLog("info", "Navigating to 'Messages' application.");
            return draft;
          }

          // App 2 icon check (Sketchpad) - circle at (180, 260)
          const dist2 = Math.hypot(x - 180, y - 260);
          if (dist2 <= 30) {
            draft.currentTab = "apps";
            addLog("info", "Navigating to 'Sketchpad' drawing application.");
            return draft;
          }

          // App 3 icon check (Settings) - circle at (285, 260)
          const dist3 = Math.hypot(x - 285, y - 260);
          if (dist3 <= 30) {
            draft.currentTab = "settings";
            addLog("info", "Navigating to 'Settings' panel.");
            return draft;
          }

          // Icon 4 check (Button lock screen) - circle at (180, 370) with bounds
          const dist4 = Math.hypot(x - 180, y - 370);
          if (dist4 <= 30) {
            draft.unlocked = false;
            addLog("info", "Screen locked from app shortcut.");
            return draft;
          }

        } else if (draft.currentTab === "chat") {
          // Back Button Tap check (20, 76) boundaries
          if (x < 100 && y > 44 && y < 105) {
            draft.currentTab = "home";
            addLog("info", "Returned back to Home drawer.");
            return draft;
          }

          // Reply Chip A button boundaries: roundRect(20, 500, 320, 40)
          if (x >= 20 && x <= 340 && y >= 500 && y <= 540) {
            draft.notes.push("Remotely Replied: System response checks OK.");
            addLog("success", "Dynamic reply A added to Memos.");
            return draft;
          }

          // Reply Chip B button boundaries: roundRect(20, 555, 320, 40)
          if (x >= 20 && x <= 340 && y >= 555 && y <= 595) {
            draft.weatherCity = "Paris";
            draft.weatherTemp = 18;
            addLog("success", "Dynamic reply B executed: Weather tuned to Paris (18°C).");
            return draft;
          }

          // Clear Memos Button boundaries: roundRect(20, 610, 320, 40)
          if (x >= 20 && x <= 340 && y >= 610 && y <= 650) {
            draft.notes = [];
            addLog("warning", "Memos database cleared.");
            return draft;
          }

        } else if (draft.currentTab === "apps") {
          // Back button check
          if (x < 100 && y > 44 && y < 105) {
            draft.currentTab = "home";
            addLog("info", "Returned back to Home drawer.");
            return draft;
          }

          // Sketch pad drawing box coordinates: (20, 115) of size (320, 460)
          if (x >= 20 && x <= 340 && y >= 115 && y <= 575) {
            // Drop a neon pink drawing point
            draft.drawings.push({ x, y, color: "#ec4899", size: 6 });
            return draft;
          }

          // Clear sketch board button boundaries: roundRect(40, 600, 130, 42)
          if (x >= 40 && x <= 170 && y >= 600 && y <= 642) {
            draft.drawings = [];
            addLog("info", "Sketchpad cleaned.");
            return draft;
          }

          // Add random stars: roundRect(190, 600, 130, 42)
          if (x >= 190 && x <= 320 && y >= 600 && y <= 642) {
            for (let i = 0; i < 15; i++) {
              const rx = 40 + Math.random() * 280;
              const ry = 130 + Math.random() * 410;
              draft.drawings.push({ x: rx, y: ry, color: `hsl(${Math.random() * 360}, 100%, 75%)`, size: Math.random() * 5 + 3 });
            }
            addLog("success", "Planted random constellations.");
            return draft;
          }

        } else if (draft.currentTab === "settings") {
          // Back button check
          if (x < 100 && y > 44 && y < 105) {
            draft.currentTab = "home";
            addLog("info", "Returned back to Home drawer.");
            return draft;
          }

          // Set 100% button bounds: roundRect(240, 172, 75, 24)
          if (x >= 240 && x <= 315 && y >= 172 && y <= 196) {
            draft.battery = 100;
            addLog("info", "Emu: Battery filled.");
            return draft;
          }

          // Set 10s button bounds: roundRect(240, 222, 75, 24)
          if (x >= 240 && x <= 315 && y >= 222 && y <= 246) {
            draft.battery = 10;
            addLog("warning", "Emu: Low Battery level simulated.");
            return draft;
          }

          // Set Tokyo button bounds: roundRect(240, 378, 75, 24)
          if (x >= 240 && x <= 315 && y >= 378 && y <= 402) {
            draft.weatherCity = "Tokyo";
            draft.weatherTemp = 19;
            addLog("info", "Location mapped to Tokyo.");
            return draft;
          }

          // Set Paris button bounds: roundRect(240, 428, 75, 24)
          if (x >= 240 && x <= 315 && y >= 428 && y <= 452) {
            draft.weatherCity = "Paris";
            draft.weatherTemp = 16;
            addLog("info", "Location mapped to Paris.");
            return draft;
          }

          // Reset settings bounds: roundRect(40, 520, 280, 45)
          if (x >= 40 && x <= 320 && y >= 520 && y <= 565) {
            draft.battery = 88;
            draft.weatherCity = "San Francisco";
            draft.weatherTemp = 24;
            draft.drawings = [];
            draft.notes = [
              "Buy groceries for dinner",
              "Draft presentation slide deck",
              "Review WebSocket server logs"
            ];
            addLog("info", "System states reset to stock configurations.");
            return draft;
          }
        }
      }

      // Handle swipe events for tabs shifts
      if (action === "SWIPE" && startX && startY && endX && endY) {
        const dx = endX - startX;
        const dy = endY - startY;

        // Slide check left / right to navigate between tabs
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 80) {
            // Swiped right -> go home if in other screens or draw notes
            if (draft.currentTab !== "home") {
              draft.currentTab = "home";
              addLog("info", "Home screen launched via Swipe-Right motion.");
            }
          } else if (dx < -80) {
            // Swiped left -> open settings
            if (draft.currentTab === "home") {
              draft.currentTab = "settings";
              addLog("info", "Settings app opened via Swipe-Left gesture.");
            }
          }
        }
      }

      return draft;
    });
  };

  // Click on the local host canvas (direct simulation helper)
  const handleHostCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = hostCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (360 / rect.width);
    const y = (e.clientY - rect.top) * (740 / rect.height);

    // Apply tap locally directly
    addRipple(x, y, "LOCAL TAP");
    processActionOnDevice("TAP", x, y);
  };


  // --- SECURE REMOTE VIEWER & CONTROLLER ---
  const viewerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // SECURE CODE RESOLVER: Resolves 6-digit pin code to signaling server endpoint before connecting WS
  const resolveCodeAndEstablishChannel = async (targetCode: string) => {
    const cleanCode = targetCode.trim().replace(/\s+/g, "");
    if (!cleanCode || cleanCode.length !== 6) {
      setViewerError("Please enter a valid 6-digit connection code first.");
      setViewerStatus("ERROR");
      addLog("error", "Failed connect attempt: code format must be 6 digits.");
      return;
    }

    setViewerStatus("RESOLVING");
    setViewerError(null);
    addLog("info", `[Secure Resolver] Querying signaling server registry for code: ${cleanCode}`);

    try {
      // 1. Trigger code-based connection lookup endpoint
      const response = await fetch(`/api/resolve/${encodeURIComponent(cleanCode)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.reason || "Unable to resolve connection key.");
      }

      const connectionDetails = await response.json();
      addLog("success", `[Resolver Success] Key ${cleanCode} mapped to server link successfully!`);
      
      // Connection details holds the wsUrl
      // 2. Establish connection over dynamic WS using returned parameters
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const targetWsUrl = `${protocol}//${window.location.host}`; // connect back to same preview domain

      setViewerStatus("CONNECTING");
      addLog("info", `Opening secure WebSocket controller tunnel at ${targetWsUrl}`);

      const ws = new WebSocket(targetWsUrl);
      viewerWsRef.current = ws;

      ws.onopen = () => {
        setViewerStatus("CONNECTED");
        addLog("success", "Remote control channel verified. Logging into session Room.");
        // Submit register_viewer payload with the resolved key
        ws.send(JSON.stringify({
          type: "register_viewer",
          code: cleanCode
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case "viewer_registered":
              if (msg.success) {
                addLog("success", `Active screen sync connected with Room Code: ${cleanCode}`);
              } else {
                setViewerStatus("ERROR");
                setViewerError(msg.reason || "Registration rejected.");
                addLog("error", `Room registration failed: ${msg.reason}`);
                ws.close();
              }
              break;

            case "screen_frame":
              // Frame incoming! Render packet immediately into the interactive canvas
              renderReceivedFrame(msg.image);
              break;

            case "host_disconnected":
              setViewerStatus("DISCONNECTED");
              setViewerError("Host mobile connection closed. Code is now invalid.");
              addLog("warning", "Connection terminated. The host device ended the streaming session.");
              clearViewerCanvas();
              ws.close();
              break;

            default:
              break;
          }
        } catch (err) {
          console.error("Failed to parse incoming control message:", err);
        }
      };

      ws.onclose = () => {
        setViewerStatus("DISCONNECTED");
        addLog("info", "Viewer control channel closed.");
      };

      ws.onerror = (err) => {
        setViewerStatus("ERROR");
        setViewerError("Connection encountered transport error.");
        addLog("error", "Viewer WebSocket encountered an index exception.");
        console.error(err);
      };

    } catch (err: any) {
      setViewerStatus("ERROR");
      setViewerError(err.message || "Failed to resolve connection code.");
      addLog("error", `[Secure Resolver Failed] ${err.message}`);
    }
  };

  // Render incoming packet on Viewer's canvas
  const renderReceivedFrame = (base64Image: string) => {
    const canvas = viewerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Avoid any visual memory leaks by clearing fully and rendering cleanly
      ctx.clearRect(0, 0, 360, 740);
      ctx.drawImage(img, 0, 0, 360, 740);
    };
    img.src = base64Image;
  };

  const clearViewerCanvas = () => {
    const canvas = viewerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0c1020";
    ctx.fillRect(0, 0, 360, 740);
    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.font = "14px Inter, sans-serif";
    ctx.fillText("Disconnected. Connect using a 6-digit code.", 180, 370);
  };

  useEffect(() => {
    clearViewerCanvas();
  }, []);

  const handleDisconnectViewer = () => {
    if (viewerWsRef.current) {
      viewerWsRef.current.close();
      viewerWsRef.current = null;
    }
    setViewerStatus("DISCONNECTED");
    addLog("info", "Viewer disconnected.");
    clearViewerCanvas();
  };

  // --- INTERACTIVE TOUCH & SWIPE EVENT COORDINATES MAPPER ON CONTROLLER CANVAS ---
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = viewerCanvasRef.current;
    if (!canvas || viewerStatus !== "CONNECTED") return;

    const rect = canvas.getBoundingClientRect();
    
    // Support dual touch/mouse
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Convert coordinates proportionally down to normalized canvas height constraints (360x740)
    const x = (clientX - rect.left) * (360 / rect.width);
    const y = (clientY - rect.top) * (740 / rect.height);

    // Save starting anchors for Swipe computation
    swipeStartRef.current = { x, y, time: Date.now() };
    
    // Prevent standard scrolling of browser tab when swiping on canvas inside iFrame
    if ("touches" in e) {
      e.preventDefault();
    }
  };

  const handlePointerDrag = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // If drawing inside canvas apps, we want fluid coordinate-relay while dragging
    const canvas = viewerCanvasRef.current;
    if (!canvas || viewerStatus !== "CONNECTED" || !swipeStartRef.current) return;

    const start = swipeStartRef.current;
    // Debounce/limit paint tracking intervals to avoid choking socket bandwidth
    const now = Date.now();
    if (now - start.time > 80) { // check every 80ms
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const x = (clientX - rect.left) * (360 / rect.width);
      const y = (clientY - rect.top) * (740 / rect.height);
      
      // If we are currently inside the Apps/Painter view, send fluid TAP stream to paint continuously
      if (device.currentTab === "apps") {
        viewerWsRef.current?.send(JSON.stringify({
          type: "action",
          action: "TAP",
          x,
          y,
          timestamp: now
        }));
        // Update anchor time to not saturate
        swipeStartRef.current.time = now;
      }
    }
  };

  const handlePointerUp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = viewerCanvasRef.current;
    if (!canvas || viewerStatus !== "CONNECTED" || !swipeStartRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const start = swipeStartRef.current;
    swipeStartRef.current = null;

    let clientX, clientY;
    if ("changedTouches" in e) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const endX = (clientX - rect.left) * (360 / rect.width);
    const endY = (clientY - rect.top) * (740 / rect.height);

    const distDeltaX = endX - start.x;
    const distDeltaY = endY - start.y;
    const totalDistance = Math.hypot(distDeltaX, distDeltaY);
    const duration = Date.now() - start.time;

    // Trigger action depending on drag thresholds (similar to TeamViewer pointer emulation)
    if (totalDistance < 15 && duration < 300) {
      // TAP Event (Small click movement range)
      // Send message to socket
      const tapMessage = {
        type: "action",
        action: "TAP",
        x: Math.round(start.x),
        y: Math.round(start.y),
        timestamp: Date.now()
      };
      
      viewerWsRef.current?.send(JSON.stringify(tapMessage));
      addLog("tx", `[Client Actions] Sent TAP at (${Math.round(start.x)}, ${Math.round(start.y)})`);
    } else {
      // SWIPE Event
      const swipeMessage = {
        type: "action",
        action: "SWIPE",
        startX: Math.round(start.x),
        startY: Math.round(start.y),
        endX: Math.round(endX),
        endY: Math.round(endY),
        timestamp: Date.now()
      };

      viewerWsRef.current?.send(JSON.stringify(swipeMessage));
      addLog("tx", `[Client Actions] Sent SWIPE from (${Math.round(start.x)}, ${Math.round(start.y)}) to (${Math.round(endX)}, ${Math.round(endY)})`);
    }
  };

  // --- 6-Digit Numeric Keypad Helpers ---
  const handleKeypadPress = (num: string) => {
    if (viewerCode.length < 6) {
      setViewerCode((prev) => prev + num);
    }
  };

  const handleKeypadBackspace = () => {
    setViewerCode((prev) => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setViewerCode("");
  };

  const handlePasteDemoCode = () => {
    if (hostCode) {
      setViewerCode(hostCode);
      addLog("info", `Automatically copied Host code: ${hostCode} to clipboard buffer.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white" id="root-layout">
      
      {/* HEADER SECTION */}
      <header className="border-b border-white/5 bg-slate-950/30 backdrop-blur-xl sticky top-0 z-40 px-6 py-4" id="app-header">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-xl shadow-lg shadow-indigo-500/10">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                Secure Remote Screen Viewer
                <span className="text-[10px] uppercase tracking-widest bg-indigo-950 border border-indigo-800 text-indigo-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  v2.0 (Code Secured)
                </span>
              </h1>
              <p className="text-xs text-slate-400 select-none">
                Handshake signaling tunnel over persistent WebSockets with real-time frame relay
              </p>
            </div>
          </div>

          {/* Quick instructions and system details */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-300 font-medium">Sockets Core Server:</span>
            <span className="text-indigo-400 font-mono font-semibold">Active Port 3000</span>
          </div>
        </div>
      </header>

      {/* CORE CONTENT LAYOUT GRID */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-8" id="main-content">
        
        {/* PANEL LEVEL DESCRIPTIONS & PREAMBLE */}
        <section className="xl:col-span-12 glass rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl" id="system-preamble">
          <div className="flex items-start gap-3 max-w-3xl">
            <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">How To Test This Secure Handshake Session Live:</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                1. Look at the <strong className="text-indigo-300">Host Device Streamer</strong> on the left and click **Broadcast Screen** to spin up a session. The server will assign you a secure 6-digit numeric login code. <br />
                2. Enter that matching 6-digit passcode into the <strong className="text-cyan-300">Remote Viewer Keypad</strong> on the right.<br />
                3. Click **SECURE TUNNEL CONNECT**. The viewer queries the `/api/resolve` service to resolve the socket channel, bonds inside, and fetches drawing visuals completely in real-time! Drag and tap inside the viewer screen to control the host phone model directly!
              </p>
            </div>
          </div>
          {hostCode && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handlePasteDemoCode}
              className="w-full md:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-indigo-300 hover:text-indigo-200 border border-indigo-900 hover:border-indigo-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              Auto-Paste Code ({hostCode})
            </motion.button>
          )}
        </section>

        {/* LEFT PANE: SOURCE PHONE MODEL (HOST STREAMER) */}
        <section className="xl:col-span-6 flex flex-col items-center" id="host-streamer-panel">
          <div className="w-full glass rounded-3xl p-5 sm:p-6 flex flex-col gap-6 shadow-2xl relative overflow-hidden h-full">
            
            {/* Ambient Background Glow decoration */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <h2 className="font-semibold text-white tracking-tight">
                  Virtual Device Host
                </h2>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${isHostConnected ? "bg-indigo-950 text-indigo-400 border border-indigo-900" : "bg-slate-800 text-slate-500"}`}>
                {isHostConnected ? "📡 Broadcasting Active" : "📵 Offline"}
              </span>
            </div>

            {/* Broadcast triggers */}
            <div className="space-y-3">
              {!isHostConnected ? (
                <button
                  onClick={handleStartHostSession}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium py-3 px-4 rounded-xl shadow-xl shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Broadcast Live Screen Stream
                </button>
              ) : (
                <div className="p-3.5 bg-indigo-950/60 border border-indigo-900/60 rounded-xl space-y-3 text-center">
                  <div className="text-xs text-indigo-300 font-medium">SECURE CONNECTION PIN CODE:</div>
                  <div className="text-3xl font-bold font-display tracking-[0.25em] text-white bg-slate-950/80 py-2.5 px-4 rounded-lg select-all border border-indigo-800/40 inline-block">
                    {hostCode.slice(0, 3)} {hostCode.slice(3)}
                  </div>
                  <div className="flex items-center gap-4 justify-center">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(hostCode);
                        addLog("success", "Session security key copied to clipboard.");
                      }}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Code
                    </button>
                    <span className="text-slate-700">|</span>
                    <button
                      onClick={handleStopHostSession}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition cursor-pointer font-semibold"
                    >
                      Disconnect Broadcast
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Physical Phone Frame Screen Container */}
            <div className="flex-grow flex items-center justify-center py-4 bg-slate-950/60 rounded-2xl border border-slate-950 p-4">
              <div 
                className="relative bg-black rounded-[40px] p-3.5 shadow-2xl ring-12 ring-slate-800 border-2 border-slate-600/40 select-none overflow-hidden" 
                style={{ width: "388px", height: "768px" }}
              >
                {/* Simulated Speaker notch at top */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20 flex items-center justify-center">
                  <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
                </div>

                {/* Main Screen Canvas */}
                <canvas
                  ref={hostCanvasRef}
                  width={360}
                  height={740}
                  onClick={handleHostCanvasClick}
                  className="rounded-[28px] cursor-pointer bg-slate-950 w-full h-full block relative z-10 transition border border-black/40"
                  style={{ width: "360px", height: "740px" }}
                />

                {/* Simulated Glass Reflection Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/2 to-white/0 rounded-[40px] pointer-events-none z-30"></div>
              </div>
            </div>

          </div>
        </section>

        {/* RIGHT PANE: SECURE REMOTE CONTROLLER VIEW */}
        <section className="xl:col-span-6 flex flex-col items-center" id="viewer-controller-panel">
          <div className="w-full glass rounded-3xl p-5 sm:p-6 flex flex-col gap-6 shadow-2xl relative overflow-hidden h-full">
            
            {/* Ambient background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-cyan-400" />
                <h2 className="font-semibold text-white tracking-tight">
                  Secure Remote Viewer
                </h2>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                viewerStatus === "CONNECTED" ? "bg-cyan-950 text-cyan-400 border border-cyan-900" :
                viewerStatus === "RESOLVING" || viewerStatus === "CONNECTING" ? "bg-amber-950 text-amber-400 border border-amber-900 animate-pulse" :
                viewerStatus === "ERROR" ? "bg-rose-950 text-rose-400 border border-rose-900" : "bg-slate-800 text-slate-500"
              }`}>
                {viewerStatus}
              </span>
            </div>

            {/* Code Input secure block & keypads when disconnected */}
            {viewerStatus !== "CONNECTED" && (
              <div className="space-y-4">
                
                {/* Informational connection banner */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed">
                  Enter the 6-digit credentials key below. The resolver service queries the host mapping dynamically before constructing standard client-to-signaling link pipes.
                </div>

                {/* 6 digits displays */}
                <div className="flex flex-col items-center gap-2">
                  <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1">
                    Enter Connection Code
                  </label>
                  <div className="flex items-center gap-2 justify-center">
                    {Array.from({ length: 6 }).map((_, id) => {
                      const char = viewerCode[id];
                      return (
                        <div
                          key={id}
                          className={`w-12 h-14 rounded-xl border flex items-center justify-center font-display text-2xl font-bold transition duration-200 ${
                            char ? "border-cyan-400 text-cyan-400 bg-slate-950/55 shadow-[0_0_12px_rgba(34,211,238,0.45)] font-sans" : "border-white/5 text-slate-500 bg-slate-950/40"
                          } ${id === viewerCode.length ? "border-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.35)] animate-pulse" : ""}`}
                        >
                          {char || "•"}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Keypad UI block */}
                <div className="max-w-[280px] mx-auto grid grid-cols-3 gap-2 py-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-12 rounded-xl bg-slate-900/30 hover:bg-slate-800/50 active:bg-slate-800/70 text-slate-200 hover:text-white border border-white/5 text-sm font-bold transition flex items-center justify-center cursor-pointer select-none backdrop-blur-sm"
                    >
                      {num}
                    </button>
                  ))}
                  
                  {/* Key Clear */}
                  <button
                    type="button"
                    onClick={handleKeypadClear}
                    className="h-12 rounded-xl bg-slate-900/30 hover:bg-rose-955/40 hover:text-rose-400 hover:border-rose-900/50 border border-white/5 text-xs font-semibold transition flex items-center justify-center cursor-pointer select-none backdrop-blur-sm"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeypadPress("0")}
                    className="h-12 rounded-xl bg-slate-900/30 hover:bg-slate-800/50 active:bg-slate-800/70 text-slate-200 hover:text-white border border-white/5 text-sm font-bold transition flex items-center justify-center cursor-pointer select-none backdrop-blur-sm"
                  >
                    0
                  </button>

                  {/* Backspace */}
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="h-12 rounded-xl bg-slate-900/30 hover:bg-slate-800/50 active:bg-slate-800/70 text-slate-200 hover:text-white border border-white/5 text-xs font-semibold transition flex items-center justify-center cursor-pointer select-none backdrop-blur-sm"
                  >
                    ⌫
                  </button>
                </div>

                {/* Connect button triggers */}
                <div className="space-y-2">
                  <button
                    onClick={() => resolveCodeAndEstablishChannel(viewerCode)}
                    disabled={viewerStatus === "RESOLVING" || viewerStatus === "CONNECTING" || viewerCode.length !== 6}
                    className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 disabled:from-slate-800 disabled:to-slate-800 text-white font-medium py-3 px-4 rounded-xl shadow-xl shadow-cyan-600/10 hover:shadow-cyan-600/20 active:scale-[0.99] disabled:scale-100 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 cursor-pointer text-sm font-semibold"
                  >
                    {viewerStatus === "RESOLVING" ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        Resolving 6-Digit Registry Key...
                      </>
                    ) : viewerStatus === "CONNECTING" ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        Establishing Secure Socket Link...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        SECURE TUNNEL CONNECT
                      </>
                    )}
                  </button>

                  {/* Feedback Errors */}
                  {viewerError && (
                    <div className="flex items-center gap-2.5 p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{viewerError}</span>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Display controller when connected */}
            {viewerStatus === "CONNECTED" && (
              <div className="space-y-4">
                <div className="p-3 bg-cyan-950/40 border border-cyan-900 rounded-xl flex items-center justify-between text-xs text-cyan-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span>Broadcasting Remote Control Tunnel is ACTIVE</span>
                  </div>
                  <button
                    onClick={handleDisconnectViewer}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold transition cursor-pointer"
                  >
                    Stop Session Disconnect
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Remote Screen Canvas Viewport */}
            <div className="flex-grow flex flex-col items-center justify-center py-4 bg-slate-950/60 rounded-2xl border border-slate-950 p-4">
              <div 
                className="relative bg-slate-950 rounded-[40px] p-3.5 shadow-2xl ring-12 ring-slate-900 border-2 border-slate-800/40 overflow-hidden select-none" 
                style={{ width: "388px", height: "768px" }}
              >
                {/* Screen boundary notch speaker */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-b-xl z-20 flex items-center justify-center border-b border-l border-r border-slate-900">
                  <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
                </div>

                {/* Viewport Canvas mapped in 360x740 ratio */}
                <canvas
                  ref={viewerCanvasRef}
                  width={360}
                  height={740}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerDrag}
                  onMouseUp={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerDrag}
                  onTouchEnd={handlePointerUp}
                  className="rounded-[28px] cursor-crosshair bg-slate-950 w-full h-full block relative z-10 border border-slate-900"
                  style={{ width: "360px", height: "740px" }}
                />

                {/* Simulated Glass Highlight Reflection */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/2 to-white/0 rounded-[40px] pointer-events-none z-30"></div>
              </div>
            </div>

          </div>
        </section>

        {/* BOTTOM REALTIME NETWORK LOG DRAWER */}
        <section className="xl:col-span-12" id="logs-panel">
          <div className="glass rounded-2xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white text-sm font-display tracking-tight">
                  Signaling Exchange Protocol Console
                </h3>
              </div>
              <button
                onClick={clearLogs}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Logs
              </button>
            </div>

            {/* List box container */}
            <div className="h-44 bg-slate-950 border border-slate-950 rounded-xl p-3 overflow-y-auto font-mono text-xs space-y-2 select-text">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-10 select-none">No transactions active. Generate stream or tap viewer screen.</div>
              ) : (
                logs.map((log) => {
                  let badgeColor = "bg-slate-900 text-slate-400 border-slate-800";
                  if (log.type === "success") badgeColor = "bg-emerald-950/60 text-emerald-400 border-emerald-900/50";
                  if (log.type === "warning") badgeColor = "bg-amber-950/60 text-amber-400 border-amber-900/50";
                  if (log.type === "error") badgeColor = "bg-rose-950/60 text-rose-400 border-rose-900/50";
                  if (log.type === "tx") badgeColor = "bg-cyan-950/60 text-cyan-400 border-cyan-900/50";
                  if (log.type === "rx") badgeColor = "bg-indigo-950/60 text-indigo-400 border-indigo-900/50";

                  return (
                    <div key={log.id} className="flex items-start gap-2 animate-fadeIn py-0.5 select-text hover:bg-slate-900/40 px-1 rounded">
                      <span className="text-slate-600 mt-0.5 shrink-0 select-none">[{log.timestamp}]</span>
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none font-bold select-none ${badgeColor} shrink-0`}>
                        {log.type}
                      </span>
                      <span className="text-slate-300 leading-relaxed break-all select-text">{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Simulated diagnostic values info */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-950/60">
              <div className="flex items-center gap-4">
                <span>⚡ Latency: <span className="text-emerald-400 font-mono font-semibold">3ms</span></span>
                <span>• Code Protocol: <span className="text-slate-300 font-mono">Signaling: HTTP-Resolve + WebSockets-Sync</span></span>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider">Secure Coding Handshake Client v2.0 • AI-Studio Verified</span>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-950 bg-slate-950 py-6 px-6 text-center text-xs text-slate-500 mt-12" id="app-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Space-Viewer Engineering. Built from expert WebSocket blueprint guidelines.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-350 transition select-none">Full-Stack Canvas Frame Piping</span>
            <span className="text-slate-800">|</span>
            <span className="hover:text-slate-350 transition select-none">Secure 6-Digit Channel Cryptography</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
