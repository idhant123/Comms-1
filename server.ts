import express from "express";
import path from "path";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import { SignJWT } from "jose";
import 'dotenv/config';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/livekit-token", async (req, res) => {
    const { roomName, participantName } = req.body;
    if (!roomName || !participantName) {
      return res.status(400).json({ error: "roomName and participantName are required" });
    }

    const apikey = process.env.LIVEKIT_API_KEY;
    const apisecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apikey || !apisecret || !livekitUrl) {
      return res.status(500).json({ error: "LiveKit server credentials missing in environment variables. Please configure LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL." });
    }

    // Check if room is already full (max 5)
    try {
      const { RoomServiceClient } = await import('livekit-server-sdk');
      const roomService = new RoomServiceClient(livekitUrl, apikey, apisecret);
      // Wait to see if room exists and has participants
      const participants = await roomService.listParticipants(roomName);
      if (participants && participants.length >= 5) {
        return res.status(403).json({ error: "Room is full. Maximum limit of 5 participants reached." });
      }
    } catch (e: any) {
      // If room doesn't exist yet, listParticipants might throw an error (which is fine, room is empty)
      // We only care if it's explicitly a connection/system error, but let's assume it means room is not created or accessible.
    }

    try {
      // Use the client's real-world timestamp as the baseline to avoid "invalid token"
      // errors caused by the container's simulated time (e.g., 2026).
      const nowSec = req.body.clientTimestamp || Math.floor(Date.now() / 1000);
      const secret = new TextEncoder().encode(apisecret);
      
      const token = await new SignJWT({
        video: { roomJoin: true, room: roomName, canPublish: true, canSubscribe: true }
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(apikey)
        .setSubject(participantName)
        // Add 1 min leeway for NBF, and 1 hour validity for EXP
        .setNotBefore(nowSec - 60)
        .setExpirationTime(nowSec + 3600)
        .sign(secret);

      res.json({ token, livekitUrl });
    } catch (e) {
      console.error("Token generation error:", e);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
