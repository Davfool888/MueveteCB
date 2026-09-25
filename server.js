import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config({ path: '.env.local' });
dotenv.config();

const { default: passengersHandler } = await import("./api/passengers.js");
const { default: chatHandler } = await import("./api/chat.js");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.post("/api/passengers", async (req, res) => {
  try {
    await passengersHandler(req, res);
  } catch (error) {
    console.error("Error en API passengers:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    await chatHandler(req, res);
  } catch (error) {
    console.error("Error en API chat:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
});

app.listen(3001, () => {
  console.log("API local disponible en http://localhost:3001");
});