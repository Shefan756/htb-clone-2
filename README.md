# CyberLearn - Docker Bridge Web Application

A React-based web application that integrates with a Docker bridge server to spawn and manage Parrot OS containers for cybersecurity learning.

## Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Node.js** (v14 or higher)
- **npm** or **yarn**

## Quick Start

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Docker Image

Build or pull the Parrot OS Docker image:

```bash
# Build from Dockerfile
docker build -t parrotsec/security:latest -f Dockerfile .

# Or pull from Docker Hub
docker pull parrotsec/security:latest
```

### Step 3: Start the Docker Bridge Server

Open a terminal and navigate to the `docker-bridge` directory:

```bash
cd docker-bridge
npm install
npm start
```

You should see the server running on `http://localhost:3001`.

**Keep this terminal open** - the bridge server needs to run while using the app.

### Step 4: Start the React Application

In a **new terminal window**, from the project root:

```bash
npm run dev
```

The app will open at `http://localhost:8080`.

## Usage

1. Open the app at `http://localhost:8080`
2. Navigate to the **Dashboard** page
3. Click **"Spawn Environment"** to start a Parrot OS container
4. Use the terminal interface to interact with the container
5. Use controls to reset, terminate, or manage the container

## Troubleshooting

### Common Issues

- **"Cannot connect to Docker daemon"**: Ensure Docker Desktop/Engine is running
- **Bridge server connection errors**: Verify the bridge server is running on port 3001
- **Container spawn failures**: Check Docker logs and ensure the image is built correctly

For more detailed troubleshooting, see [DOCKER_SETUP.md](./DOCKER_SETUP.md).

## Technologies Used

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, Socket.io, Dockerode
- **Container**: Parrot OS (Security Edition)

## Project Structure

```
├── src/                 # React frontend source
├── docker-bridge/       # Node.js bridge server
├── Dockerfile          # Parrot OS container definition
└── DOCKER_SETUP.md     # Detailed setup guide
```

## Development

- Frontend runs on `http://localhost:8080`
- Bridge server runs on `http://localhost:3001`
- Both must be running simultaneously for full functionality

For detailed development workflow and container management, refer to [DOCKER_SETUP.md](./DOCKER_SETUP.md).
