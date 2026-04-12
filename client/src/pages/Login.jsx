import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { authAPI } from "../services/api";
import "../styles/auth.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const normalizeRole = (role) => (role === "employee" ? "resident" : role);

const formatApiError = (err, fallback = "Login failed") => {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return status ? `${data} (HTTP ${status})` : data;
  }

  const message = data?.message || data?.error || err?.message;

  if (message) {
    return status ? `${message} (HTTP ${status})` : message;
  }

  if (err?.code === "ERR_NETWORK") {
    return "Network error: backend unreachable or blocked by CORS.";
  }

  const safeData =
    typeof data === "object" && data !== null
      ? JSON.stringify(data)
      : String(data || "none");

  return `${fallback} | status:${status || "none"} | code:${err?.code || "none"} | message:${err?.message || "none"} | data:${safeData}`;
};

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const getDefaultRouteByRole = (role) => {
    if (role === "admin") return "/admin";
    if (role === "employer") return "/employer-dashboard";
    return "/dashboard";
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loginPayload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      const { data } = await authAPI.login(loginPayload);
      login(data.token, data.user);

      const profileResponse = await authAPI.getProfile();
      const mergedUser = {
        ...data.user,
        ...profileResponse.data,
        role: normalizeRole(profileResponse.data?.role || data.user?.role),
      };

      login(data.token, mergedUser);

      const hasCompletedOnboarding =
        typeof mergedUser?.hasCompletedOnboarding === "boolean"
          ? mergedUser.hasCompletedOnboarding
          : mergedUser?.onboardingComplete;

      if (["resident", "employer"].includes(mergedUser?.role) && hasCompletedOnboarding === false) {
        navigate("/onboarding");
        return;
      }

      navigate(getDefaultRouteByRole(mergedUser?.role));
    } catch (err) {
      setError(formatApiError(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        <p className="auth-subtitle">Access your account to view jobs and manage applications.</p>

        {error && <p className="error-message">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={togglePasswordVisibility}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
