import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, token, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return null; // Or a spinner/loading indicator
  }

  if (!token || !user) {
    return <Navigate to="/login" />;
  }

  const isJobseeker = user.role === "resident";

  if (isJobseeker && user.onboardingComplete === false && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (requiredRole && ![].concat(requiredRole).includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};
