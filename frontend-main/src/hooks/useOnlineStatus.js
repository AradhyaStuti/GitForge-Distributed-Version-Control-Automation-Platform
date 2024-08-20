import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      toast.success("Connection restored.");
    }

    function handleOffline() {
      setIsOnline(false);
      toast.error("You are offline. Some features may be unavailable.", {
        duration: 5000,
      });
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
