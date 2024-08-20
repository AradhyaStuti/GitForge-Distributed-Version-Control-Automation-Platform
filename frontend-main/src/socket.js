import { io } from "socket.io-client";

let socket = null;

export function connectSocket(userId) {
  if (socket?.connected) return socket;

  socket = io("/", {
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    if (userId) socket.emit("joinRoom", userId);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
