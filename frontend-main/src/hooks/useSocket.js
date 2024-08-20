import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "../authContext";

export function useSocket() {
  const { currentUser } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;

    const socket = io("/", {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("joinRoom", currentUser);
    });

    socket.on("repoCreated", (data) => {
      toast.success(`Repository "${data.repository?.name}" created!`);
    });

    socket.on("issueCreated", (data) => {
      toast(`New issue in ${data.repoName}: "${data.issue?.title}"`, {
        icon: "\u{1F4CB}",
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser]);

  return socketRef;
}
