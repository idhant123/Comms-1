var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_http = require("http");
var import_vite = require("vite");
var import_jose = require("jose");
var import_config = require("dotenv/config");
async function startServer() {
  const app = (0, import_express.default)();
  const httpServer = (0, import_http.createServer)(app);
  const PORT = 3e3;
  app.use(import_express.default.json());
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
    try {
      const { RoomServiceClient } = await import("livekit-server-sdk");
      const roomService = new RoomServiceClient(livekitUrl, apikey, apisecret);
      const participants = await roomService.listParticipants(roomName);
      if (participants && participants.length >= 5) {
        return res.status(403).json({ error: "Room is full. Maximum limit of 5 participants reached." });
      }
    } catch (e) {
    }
    try {
      const nowSec = req.body.clientTimestamp || Math.floor(Date.now() / 1e3);
      const secret = new TextEncoder().encode(apisecret);
      const token = await new import_jose.SignJWT({
        video: { roomJoin: true, room: roomName, canPublish: true, canSubscribe: true }
      }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuer(apikey).setSubject(participantName).setNotBefore(nowSec - 60).setExpirationTime(nowSec + 3600).sign(secret);
      res.json({ token, livekitUrl });
    } catch (e) {
      console.error("Token generation error:", e);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
