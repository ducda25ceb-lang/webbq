import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "https://esm.sh/react@18.2.0";
import {
  DEFAULT_AUTH_SETTINGS,
  fetchAuthSettings,
  isSupabaseConfigured,
  supabase,
  toAppUser,
} from "../lib/supabase.js";

const AuthContext = createContext(null);
const STORAGE_KEY = "ember-bbq-user";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO_USER = {
  id: "U001",
  username: "khachhang",
  password: "123456",
  name: "Khách VIP",
  role: "customer",
};

function mapAuthErrorMessage(message, mode) {
  const text = (message || "").toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu chưa đúng. Nếu chưa có tài khoản, hãy chuyển sang Chế độ: Đăng ký.";
  }

  if (text.includes("user already registered")) {
    return "Email này đã có tài khoản. Hãy chuyển sang Chế độ: Đăng nhập.";
  }

  if (text.includes("email not confirmed")) {
    return "Email chưa xác thực. Vui lòng kiểm tra hộp thư để xác nhận tài khoản.";
  }

  if (text.includes("password") && text.includes("least")) {
    return "Mật khẩu chưa đủ mạnh. Vui lòng dùng mật khẩu dài hơn theo yêu cầu Supabase.";
  }

  if (mode === "signup") {
    return "Không thể đăng ký tài khoản lúc này. Vui lòng thử lại.";
  }

  return "Không thể đăng nhập lúc này. Vui lòng thử lại.";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (isSupabaseConfigured) {
      return null;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [authBusy, setAuthBusy] = useState(false);
  const [authSettings, setAuthSettings] = useState(() => ({
    ...DEFAULT_AUTH_SETTINGS,
    emailEnabled: isSupabaseConfigured,
  }));

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    Promise.all([supabase.auth.getSession(), fetchAuthSettings()])
      .then(([{ data }, nextSettings]) => {
        if (!active) {
          return;
        }

        setUser(toAppUser(data.session?.user));
        setAuthSettings(nextSettings);
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setUser(null);
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      setUser(toAppUser(session?.user));
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) {
      return;
    }

    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const login = async ({ username, password, displayName, email, mode }) => {
    if (isSupabaseConfigured) {
      const normalizedEmail = (email || username || "").trim().toLowerCase();
      const isSignupMode = mode === "signup";

      if (!normalizedEmail || !password) {
        return {
          ok: false,
          message: "Bạn cần nhập email và mật khẩu.",
        };
      }

      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return {
          ok: false,
          message: "Email chưa đúng định dạng.",
        };
      }

      if (!authSettings.emailEnabled) {
        return {
          ok: false,
          message: "Đăng nhập bằng email hiện chưa được bật trên Supabase project này.",
        };
      }

      if (isSignupMode && authSettings.disableSignup) {
        return {
          ok: false,
          message: "Supabase project này đang tắt đăng ký tài khoản mới.",
        };
      }

      setAuthBusy(true);

      try {
        const authResult = isSignupMode
          ? await supabase.auth.signUp({
              email: normalizedEmail,
              password,
              options: {
                emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
                data: {
                  display_name:
                    displayName?.trim() || normalizedEmail.split("@")[0],
                },
              },
            })
          : await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password,
            });

        if (authResult.error) {
          return {
            ok: false,
            message: mapAuthErrorMessage(authResult.error.message, mode),
          };
        }

        const sessionUser = authResult.data.session?.user;

        if (sessionUser) {
          setUser(toAppUser(sessionUser));
          return { ok: true };
        }

        if (isSignupMode && authResult.data.user) {
          setUser(null);
          return {
            ok: true,
            requiresEmailConfirmation: authSettings.requiresEmailConfirmation,
            message: authSettings.requiresEmailConfirmation
              ? "Tài khoản đã được tạo. Supabase đã gửi email xác thực, hãy xác nhận rồi đăng nhập."
              : "Tài khoản đã được tạo nhưng phiên chưa sẵn sàng. Vui lòng đăng nhập lại.",
          };
        }

        setUser(null);
        return {
          ok: false,
          message: "Phiên đăng nhập chưa sẵn sàng. Vui lòng thử lại.",
        };
      } catch (error) {
        return {
          ok: false,
          message: mapAuthErrorMessage(error?.message, mode),
        };
      } finally {
        setAuthBusy(false);
      }
    }

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

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return {
        ok: false,
        message: "Tính năng Google cần cấu hình Supabase trước khi sử dụng.",
      };
    }

    if (!authSettings.googleEnabled) {
      return {
        ok: false,
        message: "Đăng nhập bằng Google hiện chưa được bật trên Supabase project này.",
      };
    }

    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    setAuthBusy(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        return {
          ok: false,
          message: "Không thể kết nối Google lúc này. Vui lòng thử lại.",
        };
      }

      return { ok: true };
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      setUser(null);
      return;
    }

    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      login,
      signInWithGoogle,
      logout,
      demoUser: DEMO_USER,
      isSupabaseConfigured,
      authSettings,
      authBusy,
      loading,
    }),
    [authBusy, authSettings, loading, user],
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
