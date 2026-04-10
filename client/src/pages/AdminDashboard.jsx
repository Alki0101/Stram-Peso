import { Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AuthContext } from "../context/AuthContext";
import { adminAPI } from "../services/api";
import "../styles/admin.css";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUS_COLORS = {
  pending: "#9ca3af",
  reviewed: "#2563eb",
  shortlisted: "#d97706",
  rejected: "#ef4444",
  hired: "#16a34a",
};

const TABS = [
  { label: "All", value: "" },
  { label: "Employers", value: "employer" },
  { label: "Job Seekers", value: "resident" },
  { label: "Admins", value: "admin" },
];

const PAGE_LIMIT = 10;
const ACTION_MENU_WIDTH = 180;

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function ActionsMenu({ row, isBusy, onDeactivate, onReactivate, onDelete, onToggleVerification }) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [menuHeight, setMenuHeight] = useState(140);

  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const canManage = row.role !== "admin";
  const isActive = row.isActive !== false;

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const measuredHeight = menuRef.current?.offsetHeight || menuHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldOpenUpward = spaceBelow < measuredHeight + 12;

    setOpenUpward(shouldOpenUpward);

    const top = shouldOpenUpward
      ? Math.max(8, rect.top - measuredHeight - 4)
      : Math.min(window.innerHeight - measuredHeight - 8, rect.bottom + 4);

    const left = Math.max(8, rect.right - ACTION_MENU_WIDTH);

    setMenuPosition({ top, left });
  }, [menuHeight]);

  const handleToggle = () => {
    if (!open) {
      updateMenuPosition();
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return undefined;

    const rafId = requestAnimationFrame(() => {
      if (menuRef.current) {
        setMenuHeight(menuRef.current.offsetHeight || 140);
      }
      updateMenuPosition();
    });

    return () => cancelAnimationFrame(rafId);
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutside = (event) => {
      const clickedMenu = menuRef.current?.contains(event.target);
      const clickedButton = buttonRef.current?.contains(event.target);

      if (!clickedMenu && !clickedButton) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open) return undefined;

    const handleViewportChange = () => closeMenu();

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, closeMenu]);

  return (
    <div className="admin-action-wrap">
      <button
        ref={buttonRef}
        type="button"
        className="admin-action-trigger"
        onClick={handleToggle}
        disabled={isBusy}
      >
        •••
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="admin-action-menu admin-action-menu-portal"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            data-direction={openUpward ? "up" : "down"}
          >
            <button
              type="button"
              onClick={() => {
                closeMenu();
                window.alert(`${row.name}\n${row.email}`);
              }}
            >
              View Profile
            </button>

            {row.role === "employer" ? (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onToggleVerification();
                }}
              >
                {row.verificationStatus === "verified" ? "Revoke Verification" : "Verify Employer"}
              </button>
            ) : null}

            {canManage ? (
              isActive ? (
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    closeMenu();
                    onDeactivate();
                  }}
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onReactivate();
                  }}
                >
                  Reactivate
                </button>
              )
            ) : null}

            {canManage ? (
              <button
                type="button"
                className="danger"
                onClick={() => {
                  closeMenu();
                  onDelete();
                }}
              >
                Delete
              </button>
            ) : null}
          </div>,
          document.body
        )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const [roleFilter, setRoleFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");

  const [verificationTarget, setVerificationTarget] = useState("");
  const [busyUserId, setBusyUserId] = useState("");

  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, search, currentPage]);

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const { data } = await adminAPI.getAnalytics();
      setAnalytics(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data } = await adminAPI.getUsers({
        role: roleFilter || undefined,
        search: search || undefined,
        page: currentPage,
        limit: PAGE_LIMIT,
      });

      setUsers(Array.isArray(data.users) ? data.users : []);
      setTotalUsers(Number(data.total || 0));
      setTotalPages(Number(data.totalPages || 1));
      setCurrentPage(Number(data.currentPage || 1));
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const stats = useMemo(() => {
    if (!analytics) return [];

    return [
      { label: "Total Accounts", icon: "👥", value: analytics.totalAccounts, accent: "#16a34a" },
      { label: "Total Employers", icon: "🏢", value: analytics.totalEmployers, accent: "#2563eb" },
      { label: "Total Job Seekers", icon: "👤", value: analytics.totalJobSeekers, accent: "#7c3aed" },
      { label: "Total Vacancies", icon: "📋", value: analytics.totalVacancies, accent: "#d97706" },
      { label: "Total Applications", icon: "📨", value: analytics.totalApplications, accent: "#0891b2" },
      { label: "Verified Employers", icon: "✓", value: analytics.verifiedEmployers, accent: "#16a34a" },
    ];
  }, [analytics]);

  const chartData = useMemo(() => {
    if (!analytics) return [];

    const appSeries = Array.isArray(analytics.applicationsThisMonth) ? analytics.applicationsThisMonth : [];
    const regSeries = Array.isArray(analytics.registrationsThisMonth) ? analytics.registrationsThisMonth : [];

    return MONTH_LABELS.map((month, index) => ({
      month,
      applications: Number(appSeries[index] || 0),
      registrations: Number(regSeries[index] || 0),
    }));
  }, [analytics]);

  const pieData = useMemo(() => {
    const source = analytics?.applicationsByStatus || {};
    return [
      { key: "pending", name: "Pending", value: Number(source.pending || 0) },
      { key: "reviewed", name: "Reviewed", value: Number(source.reviewed || 0) },
      { key: "shortlisted", name: "Shortlisted", value: Number(source.shortlisted || 0) },
      { key: "rejected", name: "Rejected", value: Number(source.rejected || 0) },
      { key: "hired", name: "Hired", value: Number(source.hired || 0) },
    ];
  }, [analytics]);

  const roleBadgeClass = (role) => {
    if (role === "admin") return "admin-role-badge admin";
    if (role === "employer") return "admin-role-badge employer";
    return "admin-role-badge resident";
  };

  const runUserAction = async (request) => {
    try {
      await request();
      await Promise.all([fetchUsers(), fetchAnalytics()]);
      setVerificationTarget("");
    } catch (err) {
      setError(err.response?.data?.message || "Action failed");
    } finally {
      setBusyUserId("");
    }
  };

  const handleDeactivate = (targetUser) => {
    if (!window.confirm(`Deactivate ${targetUser.name}?`)) return;
    setBusyUserId(targetUser._id);
    runUserAction(() => adminAPI.deactivateUser(targetUser._id));
  };

  const handleReactivate = (targetUser) => {
    setBusyUserId(targetUser._id);
    runUserAction(() => adminAPI.reactivateUser(targetUser._id));
  };

  const handleDelete = (targetUser) => {
    if (!window.confirm(`Delete ${targetUser.name}? This cannot be undone.`)) return;
    setBusyUserId(targetUser._id);
    runUserAction(() => adminAPI.deleteUser(targetUser._id));
  };

  const handleVerification = (targetUser, verificationStatus) => {
    setBusyUserId(targetUser._id);
    runUserAction(() => adminAPI.updateEmployerVerification(targetUser._id, verificationStatus));
  };

  const handleGenerateInvite = async () => {
    try {
      const { data } = await adminAPI.generateInvite();
      setInviteCode(data.code || "");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate invite code");
    }
  };

  const copyInviteCode = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      window.alert("Invite code copied to clipboard.");
    } catch {
      window.alert("Copy failed. Please copy manually.");
    }
  };

  return (
    <div className="admin-panel-page">
      <section className="admin-banner">
        <h1>Admin Dashboard</h1>
        <p>STRAM PESO System Overview</p>
      </section>

      {error ? <p className="admin-page-error">{error}</p> : null}

      <section className="admin-stats-grid">
        {(loadingAnalytics ? Array.from({ length: 6 }, (_, i) => ({ label: `Loading-${i}`, icon: "•", value: "--", accent: "#cbd5e1" })) : stats).map((item) => (
          <article key={item.label} className="admin-stat-card" style={{ borderLeftColor: item.accent }}>
            <span className="admin-stat-icon" style={{ color: item.accent }}>{item.icon}</span>
            <strong>{item.value}</strong>
            <p>{item.label}</p>
          </article>
        ))}
      </section>

      <section className="admin-chart-grid">
        <article className="admin-chart-card">
          <h3>Applications &amp; Registrations Over Time</h3>
          <div className="admin-chart-area">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip />
                <Legend verticalAlign="top" />
                <Bar dataKey="applications" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="registrations" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="admin-chart-card">
          <h3>Applications by Status</h3>
          <div className="admin-chart-area admin-chart-area-pie">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="admin-pie-legend">
              {pieData.map((entry) => (
                <div key={entry.key} className="admin-pie-legend-item">
                  <span className="swatch" style={{ background: STATUS_COLORS[entry.key] }}></span>
                  <span>{entry.name}</span>
                  <strong>{entry.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="admin-users-panel">
        <header className="admin-users-header">
          <div>
            <h2>User Management</h2>
            <p>Monitor and manage all system accounts.</p>
          </div>
          <div className="admin-users-toolbar">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <button
              type="button"
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
              onClick={handleGenerateInvite}
            >
              + Generate Invite Code
            </button>
          </div>
        </header>

        <div className="admin-users-meta">
          <div className="admin-tab-filters">
            {TABS.map((tab) => (
              <button
                key={tab.label}
                type="button"
                className={roleFilter === tab.value ? "active" : ""}
                onClick={() => {
                  setRoleFilter(tab.value);
                  setCurrentPage(1);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p>Showing {users.length} of {totalUsers} users</p>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Avatar + Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loadingUsers && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-empty-state">
                    <div>
                      <div className="icon">🔍</div>
                      <p>No users found matching your search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((row) => {
                  const isActive = row.isActive !== false;
                  const canManage = row.role !== "admin";
                  const isBusy = busyUserId === row._id;

                  return (
                    <Fragment key={row._id}>
                      <tr>
                        <td>
                          <div className="admin-name-cell">
                            <span className="avatar">{String(row.name || "U").charAt(0).toUpperCase()}</span>
                            <div>
                              <strong>{row.name}</strong>
                              <small>{row.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={roleBadgeClass(row.role)}>{row.role}</span>
                        </td>
                        <td>
                          <span className={`admin-status ${isActive ? "active" : "inactive"}`}>
                            <i></i>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>{formatDate(row.createdAt)}</td>
                        <td>
                          <ActionsMenu
                            row={row}
                            isBusy={isBusy}
                            onDeactivate={() => handleDeactivate(row)}
                            onReactivate={() => handleReactivate(row)}
                            onDelete={() => handleDelete(row)}
                            onToggleVerification={() =>
                              setVerificationTarget(verificationTarget === row._id ? "" : row._id)
                            }
                          />
                        </td>
                      </tr>

                      {verificationTarget === row._id && row.role === "employer" ? (
                        <tr>
                          <td colSpan={5} className="admin-verification-cell">
                            <div className="admin-verification-inline">
                              <p>Set verification status for {row.name}:</p>
                              <div>
                                <button type="button" onClick={() => handleVerification(row, "unverified")}>Unverified</button>
                                <button type="button" onClick={() => handleVerification(row, "pending")}>Pending</button>
                                <button type="button" onClick={() => handleVerification(row, "verified")}>Verified ✓</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="admin-pagination">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
          >
            ← Previous
          </button>
          <p>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></p>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
          >
            Next →
          </button>
        </footer>
      </section>

      {inviteCode ? (
        <div className="admin-invite-modal-backdrop" onClick={() => setInviteCode("")}>
          <div className="admin-invite-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Employer Invite Code</h3>
            <p>{inviteCode}</p>
            <div>
              <button type="button" onClick={copyInviteCode}>Copy</button>
              <button type="button" onClick={() => setInviteCode("")}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
