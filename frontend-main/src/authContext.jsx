import { createContext, useState, useEffect, useContext } from "react";
import api from "./api";

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

// eslint-disable-next-line react/prop-types
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const userId = localStorage.getItem("userId");

    if (userId) {
      setCurrentUser(userId);
      api
        .get(`/userProfile/${userId}`, { signal: controller.signal })
        .then((res) => setUserDetails(res.data))
        .catch((err) => {
          if (err.name === "CanceledError") return;
          console.warn("Failed to load user profile:", err.response?.status || err.message);
          if (err.response?.status === 401 || err.response?.status === 404) {
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            setCurrentUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => controller.abort();
  }, []);

  const refreshUserDetails = async () => {
    if (!currentUser) return;
    try {
      const res = await api.get(`/userProfile/${currentUser}`);
      setUserDetails(res.data);
    } catch (err) {
      console.warn("Failed to refresh user details:", err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setCurrentUser(null);
    setUserDetails(null);
    window.location.href = "/auth";
  };

  const value = {
    currentUser,
    setCurrentUser,
    userDetails,
    setUserDetails,
    refreshUserDetails,
    loading,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
