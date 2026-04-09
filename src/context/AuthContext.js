import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "https://esm.sh/react@18.2.0";

const AuthContext = createContext(null);
const STORAGE_KEY = "ember-bbq-user";
const DEMO_USER = {
  id: "U001",
  username: "khachhang",
  password: "123456",
  name: "Khách VIP",
  role: "customer",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const login = ({ username, password, displayName }) => {
    const isValid =
      username === DEMO_USER.username && password === DEMO_USER.password;

    if (!isValid) {
      return {
        ok: false,
        message: "Tài khoản hoặc mật khẩu chưa đúng.",
      };
    }

    setUser({
      id: DEMO_USER.id,
      username: DEMO_USER.username,
      name: displayName?.trim() || DEMO_USER.name,
      role: DEMO_USER.role,
    });

    return { ok: true };
  };

  const logout = () => {
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, login, logout, demoUser: DEMO_USER }),
    [user],
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
