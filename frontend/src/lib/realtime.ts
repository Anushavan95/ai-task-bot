import { io } from "socket.io-client";

const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:4000";

export function createRealtimeConnection() {
  return io(REALTIME_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
  });
}
