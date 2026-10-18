
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "OPSPULSE backend is running"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const userCount = await prisma.user.count();

    res.json({
      status: "Connected",
      database: "opspulse_db",
      totalUsers: userCount
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      status: "Error",
      message: "Database connection failed"
    });
  }
});

app.listen(PORT, () => {
  console.log(`OPSPULSE server running on port ${PORT}`);
});
