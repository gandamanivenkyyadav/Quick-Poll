import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * useSocket
 * Custom hook that manages a Socket.IO connection.
 * Automatically joins a poll room and cleans up on unmount.
 *
 * @param {string} pollId - The MongoDB poll ID to join
 * @param {Function} onUpdate - Callback invoked with updated poll data
 */
const useSocket = (pollId, onUpdate) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!pollId) return;

    // Connect to the backend (proxied through Vite in development, or absolute URL in production)
    socketRef.current = io(import.meta.env.VITE_BACKEND_URL || '/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      socket.emit('join-poll', pollId);
    });

    socket.on('poll-update', (updatedPoll) => {
      if (onUpdate) onUpdate(updatedPoll);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    return () => {
      socket.emit('leave-poll', pollId);
      socket.disconnect();
    };
  }, [pollId, onUpdate]);

  return socketRef.current;
};

export default useSocket;
