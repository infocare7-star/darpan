import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

// Support ES modules __dirname in Node
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Create HTTP server
  const server = http.createServer(app);

  // Active sessions store: code (string) -> { hostWs: WebSocket, viewerWss: Set<WebSocket> }
  const activeSessions = new Map<string, { hostWs: WebSocket; viewerWss: Set<WebSocket> }>();
  // Inverse maps for cleanups on socket disconnect
  const socketToCode = new Map<WebSocket, { code: string; role: "host" | "viewer" }>();

  app.use(express.json());

  // API Endpoint: Resolve 6-digit numeric connection code to WebSocket setup details
  app.get("/api/resolve/:code", (req, res) => {
    const { code } = req.params;
    
    // Normalize code to a 6-digit string
    const normalizedCode = code.replace(/\s+/g, "");

    if (activeSessions.has(normalizedCode)) {
      // Return details for connection
      // In AI Studio, we connect back to the same origin URL with ws:// or wss://
      // We pass the code as a query param or request it over WS.
      res.json({
        success: true,
        code: normalizedCode,
        message: "Code successfully resolved to signaling server link",
        wsUrl: `ws://localhost:${PORT}`, // Viewer can use this or window.location.href protocol replacement
      });
    } else {
      res.status(404).json({
        success: false,
        reason: "Invalid Connection Code. No active device is sharing with this key.",
      });
    }
  });

  // API Endpoint: Simple diagnostic status
  app.get("/api/status", (req, res) => {
    res.json({
      status: "active",
      activeConnections: activeSessions.size,
      codes: Array.from(activeSessions.keys()),
    });
  });

  // Initialize WebSocket Sewer attached to the same HTTP server
  const wss = new WebSocketServer({ server });

  // Generate a random, cryptographically distinct 6-digit code
  function generateUniqueCode(): string {
    let attempts = 0;
    while (attempts < 100) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      if (!activeSessions.has(code)) {
        return code;
      }
      attempts++;
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection established.");

    ws.on("message", (messageData) => {
      try {
        const rawMessage = messageData.toString();
        const msg = JSON.parse(rawMessage);

        switch (msg.type) {
          case "register_host": {
            // Generate distinct 6-character connect token
            const code = generateUniqueCode();
            activeSessions.set(code, { hostWs: ws, viewerWss: new Set<WebSocket>() });
            socketToCode.set(ws, { code, role: "host" });

            // Acknowledge registration with the code
            ws.send(JSON.stringify({
              type: "host_registered",
              code: code,
              message: "Device ready. Awaiting remote controller connection..."
            }));
            console.log(`Registered Host with session code: ${code}`);
            break;
          }

          case "register_viewer": {
            const codeToJoin = msg.code ? msg.code.toString().replace(/\s+/g, "") : "";
            const session = activeSessions.get(codeToJoin);

            if (!session) {
              ws.send(JSON.stringify({
                type: "viewer_registered",
                success: false,
                reason: "Specified connection code has expired or is invalid."
              }));
              break;
            }

            // Bind viewer
            session.viewerWss.add(ws);
            socketToCode.set(ws, { code: codeToJoin, role: "viewer" });

            ws.send(JSON.stringify({
              type: "viewer_registered",
              success: true,
              code: codeToJoin,
              message: "Secure remote viewer tunnel established!"
            }));

            // Notify Host that a controller joined
            if (session.hostWs && session.hostWs.readyState === WebSocket.OPEN) {
              session.hostWs.send(JSON.stringify({
                type: "viewer_connected",
                message: "A remote controller has connected to this screen."
              }));
            }
            console.log(`Registered Viewer for session code: ${codeToJoin}`);
            break;
          }

          case "screen_frame": {
            // Host sends image stream, relay search to all connected viewers in this channel mapping
            const info = socketToCode.get(ws);
            if (info && info.role === "host") {
              const session = activeSessions.get(info.code);
              if (session && session.viewerWss.size > 0) {
                const relayString = JSON.stringify({
                  type: "screen_frame",
                  image: msg.image, // Base64 data url from client
                  timestamp: msg.timestamp || Date.now()
                });
                for (const viewer of session.viewerWss) {
                  if (viewer.readyState === WebSocket.OPEN) {
                    viewer.send(relayString);
                  }
                }
              }
            }
            break;
          }

          case "action": {
            // Viewer transmits mouse tracking (TAP, SWIPE), relay to Host code
            const info = socketToCode.get(ws);
            if (info && info.role === "viewer") {
              const session = activeSessions.get(info.code);
              if (session && session.hostWs && session.hostWs.readyState === WebSocket.OPEN) {
                // Relay TAP or SWIPE event direct to host code
                session.hostWs.send(JSON.stringify({
                  type: "action",
                  action: msg.action, // TAP or SWIPE
                  // Include respective click properties
                  x: msg.x,
                  y: msg.y,
                  startX: msg.startX,
                  startY: msg.startY,
                  endX: msg.endX,
                  endY: msg.endY,
                  timestamp: msg.timestamp || Date.now()
                }));
              }
            }
            break;
          }

          default:
            console.warn("Unrecognized message type received", msg.type);
        }
      } catch (err) {
        console.error("Failed to parse or process socket message:", err);
      }
    });

    ws.on("close", () => {
      const binding = socketToCode.get(ws);
      if (binding) {
        const { code, role } = binding;
        socketToCode.delete(ws);
        const session = activeSessions.get(code);

        if (session) {
          if (role === "host") {
            // Host closed - disconnect and notify all viewers
            console.log(`Host session closed for ${code}`);
            for (const viewer of session.viewerWss) {
              if (viewer.readyState === WebSocket.OPEN) {
                viewer.send(JSON.stringify({
                  type: "host_disconnected",
                  message: "The host mobile device disconnected from this session."
                }));
              }
            }
            activeSessions.delete(code);
          } else if (role === "viewer") {
            // Viewer closed - remove from list and notify host
            console.log(`Viewer disconnected from session ${code}`);
            session.viewerWss.delete(ws);
            if (session.hostWs && session.hostWs.readyState === WebSocket.OPEN) {
              session.hostWs.send(JSON.stringify({
                type: "viewer_disconnected",
                message: "Remote controller disconnected."
              }));
            }
          }
        }
      }
    });

    ws.on("error", (err) => {
      console.error("Socket error: ", err);
    });
  });

  // Integrate Vite dev server middleware in non-production mode
  if (process.env.NODE_ENV !== "production") {
    console.log("Mounting Vite Development Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production bundle
    const distPath = path.join(process.cwd(), "dist");
    console.log(`Serving static files from production folder: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Secure Remote Screen Viewer running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Critical: Express Server fails on startup:", error);
});
