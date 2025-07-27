import type { Request, Response, NextFunction } from "express";
import express from "express";
import apiRoutes from "./routes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// API routes
app.use("/api", apiRoutes);

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "AI Layout Optimizer API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      buildings: "/api/buildings",
      optimizeLayout: "/api/optimize-layout",
    },
    documentation: {
      optimizeLayout: {
        method: "POST",
        endpoint: "/api/optimize-layout",
        body: {
          buildingNames: ["string[]", "Array of building names to place"],
          plotConfiguration: {
            plotsX: ["number", "Number of plots horizontally"],
            plotsY: ["number", "Number of plots vertically"],
            plotSize: {
              width: ["number", "Width of each plot"],
              height: ["number", "Height of each plot"],
            },
          },
          roadPlacements: {
            positions: [
              {
                x: ["number", "X coordinate"],
                y: ["number", "Y coordinate"],
              },
            ],
          },
        },
      },
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Endpoint not found",
    message: `${req.method} ${req.path} is not a valid endpoint`,
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 AI Layout Optimizer API is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏢 Available buildings: http://localhost:${PORT}/api/buildings`);
  console.log(
    `🎯 Optimize layout: POST http://localhost:${PORT}/api/optimize-layout`
  );
  console.log(`📚 API documentation: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

export default app;
