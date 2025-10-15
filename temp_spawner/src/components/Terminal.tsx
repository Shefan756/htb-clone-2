import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io, Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  containerId: string;
  onDisconnect?: () => void;
}

export function Terminal({ containerId, onDisconnect }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current || !containerId) return;

    // Initialize xterm
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#000000',
        foreground: '#00ff00',
        cursor: '#00ff00',
        cursorAccent: '#000000',
        selection: 'rgba(255, 255, 255, 0.3)',
      },
      cols: 80,
      rows: 24,
    });

    // Initialize fit addon
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Open terminal in the DOM
    term.open(terminalRef.current);
    fitAddon.fit();

    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect to WebSocket
    const socket = io('http://localhost:3001', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      term.writeln('\x1b[1;32m[✓] Connected to container\x1b[0m');
      term.writeln('\x1b[1;36mParrot Security 5.3 (Electro Ara)\x1b[0m');
      term.writeln('');
      
      // Attach to container
      socket.emit('attach-terminal', { containerId });
    });

    socket.on('terminal-output', (data: string) => {
      term.write(data);
    });

    socket.on('error', (error: string) => {
      term.writeln(`\x1b[1;31m[ERROR] ${error}\x1b[0m`);
    });

    socket.on('terminal-disconnected', () => {
      term.writeln('\x1b[1;31m\n[✗] Container disconnected\x1b[0m');
      if (onDisconnect) onDisconnect();
    });

    socket.on('disconnect', () => {
      term.writeln('\x1b[1;31m\n[✗] Connection lost\x1b[0m');
    });

    // Handle user input
    term.onData((data) => {
      socket.emit('terminal-input', data);
    });

    // Handle terminal resize
    const handleResize = () => {
      fitAddon.fit();
      socket.emit('terminal-resize', {
        rows: term.rows,
        cols: term.cols,
      });
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      term.dispose();
    };
  }, [containerId, onDisconnect]);

  // Expose fit method for fullscreen
  useEffect(() => {
    const handleFit = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        if (socketRef.current && xtermRef.current) {
          socketRef.current.emit('terminal-resize', {
            rows: xtermRef.current.rows,
            cols: xtermRef.current.cols,
          });
        }
      }
    };

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(handleFit, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      ref={terminalRef} 
      className="terminal-container w-full h-full"
      style={{ height: '100%', minHeight: '400px' }}
    />
  );
}
