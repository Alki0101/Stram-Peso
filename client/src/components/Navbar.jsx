import { useContext, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaEnvelope, FaUserCircle } from "react-icons/fa";
import { AuthContext } from "../context/AuthContext";
import { messageAPI } from "../services/api";
import { useSocket } from "../context/SocketContext";
import "../styles/navbar.css";
import pesoLogo from "../assets/images/peso-logo.png";

const normalizeRole = (role) => (role === "employee" ? "resident" : role);

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const userRole = normalizeRole(user?.role);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) {
        setUnreadCount(0);
        return;
      }

      try {
        const { data } = await messageAPI.getUnreadCount();
        setUnreadCount(Number(data?.count || 0));
      } catch (error) {
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
  }, [user, location.pathname]);

  useEffect(() => {
    if (!socket || !user) return undefined;

    const currentUserId = String(user._id || user.id);

    const handleReceiveMessage = (message) => {
      const senderId = String(message?.sender?._id || message?.sender || "");
      if (!senderId || senderId === currentUserId) return;

      if (location.pathname === "/messages") {
        return;
      }

      setUnreadCount((prev) => prev + 1);
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, user, location.pathname]);

  useEffect(() => {
    if (!user) {
      setShowLogoutModal(false);
    }
  }, [user]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const openLogoutModal = () => {
    setIsMobileMenuOpen(false);
    setShowLogoutModal(true);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      

        <div className="nav-container">
        {/* Logo Section */}
        <Link to="/" className="nav-logo-section">
          <div className="nav-logo-icon">
            <img src={pesoLogo} alt="PESO Marinduque Logo" />
          </div>
          <span className="nav-logo-text">STRAM PESO</span>
        </Link>

        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav-panel"
        >
          {isMobileMenuOpen ? "CLOSE" : "MENU"}
        </button>

        <div className="nav-links">
          <Link to="/">Home</Link>

          {user ? (
            <>
              <button type="button" className="user-pill-button" onClick={() => navigate("/profile")}>
                <span className="user-name">
                  <FaUserCircle className="user-pill-icon" aria-hidden="true" />
                  {user.name}
                </span>
              </button>
              {userRole === "admin" && <Link to="/admin">Admin Dashboard</Link>}

              {userRole === "employer" && (
                <>
                  <Link to="/employer">Employer Dashboard</Link>
                  <Link to="/post-job">Post Vacancy</Link>
                </>
              )}

              {userRole === "resident" && (
                <>
                  <Link to="/dashboard">My Dashboard</Link>
                  <Link to="/jobs">Browse Jobs</Link>
                </>
              )}

              <Link to="/messages" className="messages-link">
                <FaEnvelope className="nav-link-icon" aria-hidden="true" />
                <span>Messages</span>
                {unreadCount > 0 && (
                  <span className="user-unread-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
              </Link>
              <button className="logout-btn" onClick={openLogoutModal}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
              <Link to="/register-employer">Register as Employer</Link>
            </>
          )}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
          <aside
            id="mobile-nav-panel"
            className="mobile-menu-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-menu-links">
              <Link to="/" onClick={closeMobileMenu}>Home</Link>

              {user ? (
                <>
                  <button
                    type="button"
                    className="user-pill-button"
                    onClick={() => {
                      navigate("/profile");
                      closeMobileMenu();
                    }}
                  >
                    <span className="user-name">
                      <FaUserCircle className="user-pill-icon" aria-hidden="true" />
                      {user.name}
                    </span>
                  </button>

                  {userRole === "admin" && (
                    <Link to="/admin" onClick={closeMobileMenu}>Admin Dashboard</Link>
                  )}

                  {userRole === "employer" && (
                    <>
                      <Link to="/employer" onClick={closeMobileMenu}>Employer Dashboard</Link>
                      <Link to="/post-job" onClick={closeMobileMenu}>Post Vacancy</Link>
                    </>
                  )}

                  {userRole === "resident" && (
                    <>
                      <Link to="/dashboard" onClick={closeMobileMenu}>My Dashboard</Link>
                      <Link to="/jobs" onClick={closeMobileMenu}>Browse Jobs</Link>
                    </>
                  )}

                  <Link to="/messages" className="messages-link" onClick={closeMobileMenu}>
                    <FaEnvelope className="nav-link-icon" aria-hidden="true" />
                    <span>Messages</span>
                    {unreadCount > 0 && (
                      <span className="user-unread-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                    )}
                  </Link>

                  <button className="logout-btn" onClick={openLogoutModal}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeMobileMenu}>Login</Link>
                  <Link to="/register" onClick={closeMobileMenu}>Register</Link>
                  <Link to="/register-employer" onClick={closeMobileMenu}>Register as Employer</Link>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Log out of STRAM PESO?</h3>
            <p>You will need to sign in again to access your account.</p>
            <div className="logout-modal-actions">
              <button type="button" className="logout-cancel-btn" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button type="button" className="logout-confirm-btn" onClick={handleConfirmLogout}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
