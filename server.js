import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const { default: handler } = await import("./api/passengers.js");

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
    await handler(req, res);
  } catch (error) {
    console.error("Error en API:", error);

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