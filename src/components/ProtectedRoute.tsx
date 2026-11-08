import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

type AuthState = "loading" | "ready" | "invalid";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Validates the stored admin token against the backend before rendering
// the protected page. Pages with no token (logged out) still render
// their own login UI; only a present-but-invalid token triggers a redirect.
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [authState, setAuthState] = useState<AuthState>(() =>
    localStorage.getItem("adminToken") ? "loading" : "ready"
  );

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      return;
    }

    let cancelled = false;

    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (cancelled) return;
        if (res.status === 401) {
          localStorage.removeItem("adminToken");
          setAuthState("invalid");
        } else {
          setAuthState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setAuthState("ready");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (authState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (authState === "invalid") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
