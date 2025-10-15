/**
 * Docker Bridge API Server
 * 
 * This local server bridges the React frontend with Docker daemon.
 * Run this server locally to enable Docker container management from the web app.
 * 
 * Requirements:
 * - Node.js installed
 * - Docker installed and running
 * 
 * Installation:
 * 1. cd docker-bridge
 * 2. npm install express cors dockerode
 * 3. node server.js
 * 
 * The server will run on http://localhost:3001
 */

const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const docker = new Docker();
const PORT = 3001;

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active containers
const activeContainers = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Docker bridge is running' });
});

// Spawn a new Parrot OS container
app.post('/api/docker/spawn', async (req, res) => {
  try {
    const { challengeId, image = 'parrotsec/security:latest' } = req.body;

    console.log(`Spawning container for challenge: ${challengeId}`);

    // Pull the image if not available
    try {
      await docker.pull(image);
      console.log(`Image ${image} pulled successfully`);
    } catch (pullError) {
      console.log(`Image already exists or pull failed: ${pullError.message}`);
    }

    // Create and start container
    const container = await docker.createContainer({
      Image: image,
      Cmd: ['/bin/bash'],
      Tty: true,
      OpenStdin: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      name: `parrot-${challengeId}-${Date.now()}`,
      HostConfig: {
        AutoRemove: true,
        NetworkMode: 'bridge'
      }
    });

    await container.start();
    
    // Get container info
    const containerInfo = await container.inspect();
    const ipAddress = containerInfo.NetworkSettings.IPAddress || '172.17.0.2';

    // Store container reference
    activeContainers.set(container.id, {
      container,
      challengeId,
      spawnedAt: new Date()
    });

    console.log(`Container spawned: ${container.id}`);

    res.json({
      success: true,
      containerId: container.id,
      ipAddress,
      message: 'Container spawned successfully'
    });
  } catch (error) {
    console.error('Error spawning container:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Terminate a container
app.post('/api/docker/terminate', async (req, res) => {
  try {
    const { containerId } = req.body;

    if (!activeContainers.has(containerId)) {
      return res.status(404).json({
        success: false,
        error: 'Container not found'
      });
    }

    const { container } = activeContainers.get(containerId);
    
    await container.stop();
    activeContainers.delete(containerId);

    console.log(`Container terminated: ${containerId}`);

    res.json({
      success: true,
      message: 'Container terminated successfully'
    });
  } catch (error) {
    console.error('Error terminating container:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reset a container
app.post('/api/docker/reset', async (req, res) => {
  try {
    const { containerId } = req.body;

    if (!activeContainers.has(containerId)) {
      return res.status(404).json({
        success: false,
        error: 'Container not found'
      });
    }

    const { container } = activeContainers.get(containerId);
    
    await container.restart();

    console.log(`Container reset: ${containerId}`);

    res.json({
      success: true,
      message: 'Container reset successfully'
    });
  } catch (error) {
    console.error('Error resetting container:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List all active containers
app.get('/api/docker/containers', async (req, res) => {
  try {
    const containers = Array.from(activeContainers.values()).map(({ challengeId, spawnedAt }) => ({
      challengeId,
      spawnedAt
    }));

    res.json({
      success: true,
      containers,
      count: containers.length
    });
  } catch (error) {
    console.error('Error listing containers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// WebSocket connection for terminal
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('attach-terminal', async ({ containerId }) => {
    console.log(`Attaching terminal to container: ${containerId}`);
    
    try {
      const containerData = activeContainers.get(containerId);
      if (!containerData) {
        socket.emit('error', 'Container not found');
        return;
      }

      const { container } = containerData;
      
      // Attach to container with TTY
      const exec = await container.exec({
        Cmd: ['/bin/bash'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true
      });

      const stream = await exec.start({
        hijack: true,
        stdin: true,
        Tty: true
      });

      // Store stream reference
      socket.containerStream = stream;

      // Send container output to client
      stream.on('data', (data) => {
        socket.emit('terminal-output', data.toString('utf-8'));
      });

      // Handle client input
      socket.on('terminal-input', (data) => {
        if (socket.containerStream) {
          socket.containerStream.write(data);
        }
      });

      // Handle resize events
      socket.on('terminal-resize', async ({ rows, cols }) => {
        try {
          await exec.resize({ h: rows, w: cols });
        } catch (err) {
          console.error('Resize error:', err);
        }
      });

      stream.on('end', () => {
        console.log('Container stream ended');
        socket.emit('terminal-disconnected');
      });

    } catch (error) {
      console.error('Error attaching to container:', error);
      socket.emit('error', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.containerStream) {
      socket.containerStream.end();
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🐳 Docker Bridge Server Running');
  console.log(`${'='.repeat(60)}`);
  console.log(`Server:     http://localhost:${PORT}`);
  console.log(`WebSocket:  ws://localhost:${PORT}`);
  console.log(`Health:     http://localhost:${PORT}/api/health`);
  console.log(`${'='.repeat(60)}\n`);
  console.log('✅ Ready to accept container requests from the web app');
  console.log('📝 Make sure Docker daemon is running\n');
});
