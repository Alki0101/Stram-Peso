import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { authAPI } from "../services/api";
import "../styles/auth.css";

const normalizeRole = (role) => (role === "employee" ? "resident" : role);

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const registerResponse = await authAPI.register(formData);
      const registeredHasCompletedOnboarding =
        typeof registerResponse.data?.hasCompletedOnboarding === "boolean"
          ? registerResponse.data.hasCompletedOnboarding
          : registerResponse.data?.onboardingComplete;

      const { data: loginResponse } = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      login(loginResponse.token, loginResponse.user);

      const profileResponse = await authAPI.getProfile();
      const mergedUser = {
        ...loginResponse.user,
        ...profileResponse.data,
        role: normalizeRole(profileResponse.data?.role || loginResponse.user?.role),
      };

      login(loginResponse.token, mergedUser);

      const mergedHasCompletedOnboarding =
        typeof mergedUser?.hasCompletedOnboarding === "boolean"
          ? mergedUser.hasCompletedOnboarding
          : mergedUser?.onboardingComplete;

      if (registeredHasCompletedOnboarding === false || mergedHasCompletedOnboarding === false) {
        navigate("/onboarding");
      } else {
        navigate(getDefaultRouteByRole(mergedUser?.role));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Register now to discover local jobs and join the STRAM PESO community.</p>

        {error && <p className="error-message">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
