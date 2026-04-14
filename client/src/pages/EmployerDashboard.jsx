import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { employerAPI, messageAPI } from "../services/api";
import "../styles/employer-dashboard.css";

const tabList = ["overview", "jobs", "applicants"];

const defaultJobForm = {
  title: "",
  location: "",
  jobType: "Full-time",
  salary: "",
  slots: 1,
  description: "",
  requirements: "",
};

const statusClass = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (["active", "hired"].includes(normalized)) return "green";
  if (["pending", "applied"].includes(normalized)) return "gray";
  if (["reviewed"].includes(normalized)) return "blue";
  if (["shortlisted"].includes(normalized)) return "amber";
  if (["rejected", "closed"].includes(normalized)) return "red";
  return "gray";
};

const normalizeApplicationStatus = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "applied") return "pending";
  if (normalized === "accepted") return "hired";
  if (normalized === "reviewed") return "reviewed";
  if (normalized === "rejected") return "rejected";
  return normalized || "pending";
};

const formatDate = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getApplicantContact = (application) => {
  const applicant = application?.applicant || {};
  return applicant.phone || applicant.contactNumber || applicant.mobile || applicant.email || "N/A";
};

const normalizeRecentApplicantStatus = (value) => {
  const normalized = normalizeApplicationStatus(value);
  if (normalized === "active") return "active";
  if (normalized === "hired") return "hired";
  return "pending";
};

const recentApplicantStatusClass = (value) => `recent-${normalizeRecentApplicantStatus(value)}`;

const recentApplicantStatusLabel = (value) => {
  const normalized = normalizeRecentApplicantStatus(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getInitials = (name) => {
  const text = String(name || "").trim();
  if (!text) return "NA";
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const normalizeDrawerStatus = (value) => {
  const normalized = normalizeApplicationStatus(value);
  if (["pending", "shortlisted", "hired", "rejected"].includes(normalized)) return normalized;
  return "pending";
};

export default function EmployerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplicants: 0,
    pendingReview: 0,
    shortlisted: 0,
    hired: 0,
  });
  const [jobs, setJobs] = useState([]);
  const [jobApplicants, setJobApplicants] = useState({});
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [recentApplicants, setRecentApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobForm, setJobForm] = useState(defaultJobForm);
  const [isSavingJob, setIsSavingJob] = useState(false);

  const [selectedApplication, setSelectedApplication] = useState(null);
  const [drawerStatus, setDrawerStatus] = useState("pending");
  const [drawerNote, setDrawerNote] = useState("");
  const [isSavingApplication, setIsSavingApplication] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!successToast) return;
    const timer = window.setTimeout(() => setSuccessToast(""), 2500);
    return () => window.clearTimeout(timer);
  }, [successToast]);

  const selectedJobApplicants = selectedJobId ? jobApplicants[selectedJobId] || [] : [];

  const selectedJob = useMemo(
    () => jobs.find((job) => job._id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");

    try {
      const [{ data: statsData }, { data: jobsData }] = await Promise.all([
        employerAPI.getStats(),
        employerAPI.getJobs(),
      ]);

      setStats(statsData);
      setJobs(jobsData);

      if (jobsData.length) {
        const applicantRequests = jobsData.map((job) => employerAPI.getApplicantsForJob(job._id));
        const applicantResponses = await Promise.all(applicantRequests);

        const nextApplicants = {};
        const allApplicants = [];
        jobsData.forEach((job, index) => {
          const list = applicantResponses[index].data || [];
          nextApplicants[job._id] = list;
          list.forEach((application) => {
            allApplicants.push({
              ...application,
              vacancy: { _id: job._id, title: job.title },
            });
          });
        });

        allApplicants.sort((a, b) => new Date(b.createdAt || b.appliedAt) - new Date(a.createdAt || a.appliedAt));

        setJobApplicants(nextApplicants);
        setRecentApplicants(allApplicants.slice(0, 5));
        setSelectedJobId((current) => current || jobsData[0]._id);
      } else {
        setJobApplicants({});
        setRecentApplicants([]);
        setSelectedJobId(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load employer dashboard");
    } finally {
      setLoading(false);
    }
  };

  const openCreateJobModal = () => {
    setEditingJob(null);
    setJobForm(defaultJobForm);
    setIsJobModalOpen(true);
  };

  const openEditJobModal = (job) => {
    setEditingJob(job);
    setJobForm({
      title: job.title || "",
      location: job.location || "",
      jobType: job.jobType || "Full-time",
      salary: job.salary || "",
      slots: job.slots || 1,
      description: job.description || "",
      requirements: job.requirements || "",
    });
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async (event) => {
    event.preventDefault();
    setIsSavingJob(true);
    setError("");

    try {
      if (editingJob?._id) {
        await employerAPI.updateJob(editingJob._id, jobForm);
        setSuccessToast("Job updated successfully");
      } else {
        await employerAPI.createJob(jobForm);
        setSuccessToast("Job posted successfully");
      }
      setIsJobModalOpen(false);
      await loadDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save job");
    } finally {
      setIsSavingJob(false);
    }
  };

  const handleCloseOrReopen = async (job) => {
    setError("");
    try {
      if (job.status === "closed") {
        await employerAPI.updateJob(job._id, { status: "active" });
        setSuccessToast("Job reopened");
      } else {
        await employerAPI.closeJob(job._id);
        setSuccessToast("Job closed");
      }
      await loadDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update job status");
    }
  };

  const openApplicantDrawer = (application) => {
    setSelectedApplication(application);
    setDrawerStatus(normalizeDrawerStatus(application.status));
    setDrawerNote(application.employerNote || "");
  };

  const handleSaveApplicationStatus = async () => {
    if (!selectedApplication?._id) return;

    setIsSavingApplication(true);
    setError("");

    try {
      await employerAPI.updateApplicationStatus(selectedApplication._id, {
        status: drawerStatus,
        employerNote: drawerNote,
      });

      setSuccessToast("Application updated successfully");
      setSelectedApplication(null);
      await loadDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update application");
    } finally {
      setIsSavingApplication(false);
    }
  };

  const handleMessageApplicant = async (applicantId) => {
    if (!applicantId) return;

    try {
      const { data } = await messageAPI.createConversation({ participantId: applicantId });
      const conversationId = data?._id;
      if (conversationId) {
        navigate("/messages", { state: { conversationId } });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start conversation");
    }
  };

  const statsCards = [
    { icon: "📁", label: "Total Jobs", value: stats.totalJobs, tone: "green" },
    { icon: "✅", label: "Active Jobs", value: stats.activeJobs, tone: "green" },
    { icon: "👥", label: "Total Applicants", value: stats.totalApplicants, tone: "green" },
    { icon: "⏳", label: "Pending Review", value: stats.pendingReview, tone: "amber" },
    { icon: "📌", label: "Shortlisted", value: stats.shortlisted, tone: "blue" },
    { icon: "🎉", label: "Hired", value: stats.hired, tone: "green" },
  ];

  return (
    <div className="dashboard-container employer-dashboard-page">
      <div className="dashboard-header">
        <div className="profile-section">
          <div className="profile-avatar">EM</div>
          <div className="profile-info">
            <h1>Employer Dashboard</h1>
            <p>Manage postings, applicants, and hiring updates in one place.</p>
          </div>
        </div>
      </div>

      <section className="employer-shell">
        <div className="employer-tabs" role="tablist" aria-label="Employer dashboard tabs">
          {tabList.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              className={`employer-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "overview" ? "Overview" : tab === "jobs" ? "My Job Postings" : "Applicants"}
            </button>
          ))}
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <p className="loading">Loading dashboard...</p>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="employer-tab-panel">
                <div className="stats-grid">
                  {statsCards.map((card) => (
                    <article key={card.label} className={`stat-card tone-${card.tone}`}>
                      <span className="stat-icon" aria-hidden="true">{card.icon}</span>
                      <strong>{card.value}</strong>
                      <p>{card.label}</p>
                    </article>
                  ))}
                </div>

                <div className="table-card">
                  <div className="table-card-header">
                    <h2>Recent Applicants</h2>
                  </div>
                  {!recentApplicants.length ? (
                    <div className="recent-applicants-empty">No recent applicants yet.</div>
                  ) : (
                    <>
                      <div className="table-scroll-wrap recent-applicants-table-wrap">
                        <table className="employer-table recent-applicants-table">
                          <colgroup>
                            <col style={{ width: "22%" }} />
                            <col style={{ width: "24%" }} />
                            <col style={{ width: "14%" }} />
                            <col style={{ width: "13%" }} />
                            <col style={{ width: "15%" }} />
                            <col style={{ width: "12%" }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th>Applicant Name</th>
                              <th>Applied For</th>
                              <th>Date</th>
                              <th>Status</th>
                              <th>Contact</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentApplicants.map((application) => (
                              <tr key={application._id}>
                                <td>{application.applicant?.name || "Unknown Applicant"}</td>
                                <td>{application.vacancy?.title || "Unknown Job"}</td>
                                <td>{formatDate(application.createdAt || application.appliedAt)}</td>
                                <td>
                                  <span className={`status-pill ${recentApplicantStatusClass(application.status)}`}>
                                    {recentApplicantStatusLabel(application.status)}
                                  </span>
                                </td>
                                <td>{getApplicantContact(application)}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="recent-view-btn"
                                    onClick={() => openApplicantDrawer(application)}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="recent-applicants-mobile" aria-label="Recent applicants mobile list">
                        {recentApplicants.map((application) => (
                          <article key={`mobile-${application._id}`} className="recent-applicant-card">
                            <div className="recent-applicant-top">
                              <strong>{application.applicant?.name || "Unknown Applicant"}</strong>
                              <span className={`status-pill ${recentApplicantStatusClass(application.status)}`}>
                                {recentApplicantStatusLabel(application.status)}
                              </span>
                            </div>
                            <div className="recent-applicant-grid">
                              <span className="label">Applied For</span>
                              <span className="value">{application.vacancy?.title || "Unknown Job"}</span>

                              <span className="label">Date</span>
                              <span className="value">{formatDate(application.createdAt || application.appliedAt)}</span>

                              <span className="label">Contact</span>
                              <span className="value">{getApplicantContact(application)}</span>

                              <span className="label">Action</span>
                              <span className="value">
                                <button
                                  type="button"
                                  className="recent-view-btn"
                                  onClick={() => openApplicantDrawer(application)}
                                >
                                  View
                                </button>
                              </span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === "jobs" && (
              <div className="employer-tab-panel">
                <div className="panel-header-row">
                  <h2>My Job Postings</h2>
                  <button type="button" className="green-btn" onClick={openCreateJobModal}>
                    + Post New Job
                  </button>
                </div>

                <div className="jobs-grid">
                  {!jobs.length ? (
                    <p className="empty-muted">You have no job postings yet.</p>
                  ) : (
                    jobs.map((job) => (
                      <article key={job._id} className="job-card">
                        <div className="job-card-head">
                          <h3>{job.title}</h3>
                          <span className={`status-pill ${statusClass(job.status)}`}>{job.status || "active"}</span>
                        </div>
                        <p className="job-meta">{job.location}</p>
                        <p className="job-meta">Salary: {job.salary || "Negotiable"}</p>
                        <p className="job-meta">Applicants: {job.applicantCount || 0}</p>
                        <p className="job-meta">Posted: {formatDate(job.createdAt)}</p>

                        <div className="job-actions">
                          <button type="button" className="outline-btn" onClick={() => openEditJobModal(job)}>Edit</button>
                          <button type="button" className="outline-btn" onClick={() => handleCloseOrReopen(job)}>
                            {job.status === "closed" ? "Reopen" : "Close"}
                          </button>
                          <button
                            type="button"
                            className="outline-btn"
                            onClick={() => {
                              setActiveTab("applicants");
                              setSelectedJobId(job._id);
                            }}
                          >
                            View Applicants
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "applicants" && (
              <div className="employer-tab-panel applicants-layout">
                <aside className="job-list-panel">
                  <h3>Your Jobs</h3>
                  {!jobs.length ? (
                    <p className="empty-muted">No jobs yet.</p>
                  ) : (
                    jobs.map((job) => (
                      <button
                        type="button"
                        key={job._id}
                        className={`job-list-item ${selectedJobId === job._id ? "active" : ""}`}
                        onClick={() => setSelectedJobId(job._id)}
                      >
                        <strong>{job.title}</strong>
                        <small>{job.location}</small>
                      </button>
                    ))
                  )}
                </aside>

                <section className="applicants-panel">
                  <div className="panel-header-row">
                    <h2>{selectedJob ? `${selectedJob.title} Applicants` : "Applicants"}</h2>
                  </div>

                  {!selectedJobId ? (
                    <p className="empty-muted">Select a job to view applicants.</p>
                  ) : !selectedJobApplicants.length ? (
                    <p className="empty-muted">No applicants yet for this job.</p>
                  ) : (
                    <div className="applicant-list">
                      {selectedJobApplicants.map((application) => (
                        <article key={application._id} className="applicant-row">
                          <span className="applicant-avatar">
                            {(application.applicant?.name || "U").trim().charAt(0).toUpperCase()}
                          </span>
                          <div className="applicant-info">
                            <strong>{application.applicant?.name || "Unknown"}</strong>
                            <p>{application.applicant?.email || "No email"}</p>
                          </div>
                          <div className="applicant-date">{formatDate(application.createdAt || application.appliedAt)}</div>
                          <span className={`status-pill ${statusClass(application.status)}`}>
                            {normalizeApplicationStatus(application.status)}
                          </span>
                          <div className="applicant-row-actions">
                            <button type="button" className="text-action-btn" onClick={() => openApplicantDrawer(application)}>
                              View Details
                            </button>
                            <button
                              type="button"
                              className="text-action-btn"
                              onClick={() => handleMessageApplicant(application.applicant?._id)}
                            >
                              Message Applicant
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </section>

      {isJobModalOpen && (
        <div className="modal-overlay" onClick={() => setIsJobModalOpen(false)}>
          <div className="job-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{editingJob ? "Edit Job Posting" : "Post New Job"}</h3>

            <form className="job-form-grid" onSubmit={handleSaveJob}>
              <label>
                Job Title
                <input
                  type="text"
                  value={jobForm.title}
                  onChange={(event) => setJobForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </label>

              <label>
                Location
                <input
                  type="text"
                  value={jobForm.location}
                  onChange={(event) => setJobForm((prev) => ({ ...prev, location: event.target.value }))}
                  required
                />
              </label>

              <label>
                Job Type
                <select
                  value={jobForm.jobType}
                  onChange={(event) => setJobForm((prev) => ({ ...prev, jobType: event.target.value }))}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
              </label>

              <label>
                Salary
                <input
                  type="text"
                  value={jobForm.salary}
                  onChange={(event) => setJobForm((prev) => ({ ...prev, salary: event.target.value }))}
                />
              </label>

              <label>
                Slots Available
                <input
                  type="number"
                  min="1"
                  value={jobForm.slots}
                  onChange={(event) => setJobForm((prev) => ({ ...prev, slots: Number(event.target.value) || 1 }))}
                />
              </label>

              <label className="full-width">
                Description
                <textarea
                  value={jobForm.description}
                  onChange={(event) => setJobForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows="4"
                  required
                />
              </label>

              <label className="full-width">
                Requirements
                <textarea
                  value={jobForm.requirements}
                  onChange={(event) => setJobForm((prev) => ({ ...prev, requirements: event.target.value }))}
                  rows="3"
                />
              </label>

              <div className="job-modal-actions full-width">
                <button type="button" className="outline-btn" onClick={() => setIsJobModalOpen(false)} disabled={isSavingJob}>
                  Cancel
                </button>
                <button type="submit" className="green-btn" disabled={isSavingJob}>
                  {isSavingJob ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedApplication && (
        <div className="drawer-overlay" onClick={() => setSelectedApplication(null)}>
          <aside className="applicant-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-handle" aria-hidden="true" />

            <header className="drawer-header">
              <div className="drawer-header-main">
                <div className="drawer-avatar">{getInitials(selectedApplication.applicant?.name)}</div>
                <div className="drawer-header-text">
                  <h3>{selectedApplication.applicant?.name || "N/A"}</h3>
                  <p>{selectedApplication.vacancy?.title || "Applied Position"}</p>
                </div>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setSelectedApplication(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </header>

            <div className="drawer-body">
              <div className="drawer-info-list">
                <div className="drawer-info-row">
                  <span className="drawer-info-label">Full name</span>
                  <span className="drawer-info-value">{selectedApplication.applicant?.name || "N/A"}</span>
                </div>
                <div className="drawer-info-row">
                  <span className="drawer-info-label">Email</span>
                  <span className="drawer-info-value">{selectedApplication.applicant?.email || "N/A"}</span>
                </div>
                <div className="drawer-info-row">
                  <span className="drawer-info-label">Phone</span>
                  <span className="drawer-info-value">{selectedApplication.applicant?.phone || "N/A"}</span>
                </div>
                <div className="drawer-info-row">
                  <span className="drawer-info-label">Address</span>
                  <span className="drawer-info-value">{selectedApplication.applicant?.address || "N/A"}</span>
                </div>
                <div className="drawer-info-row">
                  <span className="drawer-info-label">Application date</span>
                  <span className="drawer-info-value">{formatDate(selectedApplication.createdAt || selectedApplication.appliedAt)}</span>
                </div>
              </div>

              <div className="drawer-section">
                <p className="drawer-section-label">Skills</p>
                <div className="drawer-skill-list">
                  {(selectedApplication.applicant?.skills || []).length ? (
                    selectedApplication.applicant.skills.map((skill) => <span key={skill}>{skill}</span>)
                  ) : (
                    <span className="skill-empty">No skills listed</span>
                  )}
                </div>
              </div>

              {selectedApplication.resume ? (
                <a
                  className="drawer-resume-link"
                  href={`http://localhost:3000/${String(selectedApplication.resume).replace(/^\/+/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span aria-hidden="true">↓</span>
                  <span>Download Resume</span>
                </a>
              ) : null}

              <label className="drawer-field">
                <span className="drawer-section-label">Status</span>
                <select
                  className={`drawer-status-select status-${drawerStatus}`}
                  value={drawerStatus}
                  onChange={(event) => setDrawerStatus(event.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>

              <label className="drawer-field">
                <span className="drawer-section-label">Note to Applicant</span>
                <textarea
                  rows="4"
                  value={drawerNote}
                  onChange={(event) => setDrawerNote(event.target.value)}
                  placeholder="Add a quick status note…"
                />
              </label>

              <footer className="drawer-footer">
                <button
                  type="button"
                  className="drawer-save-btn"
                  onClick={handleSaveApplicationStatus}
                  disabled={isSavingApplication}
                >
                  {isSavingApplication ? "Saving..." : "Save & Notify"}
                </button>
              </footer>
            </div>
          </aside>
        </div>
      )}

      {successToast && <div className="success-toast">{successToast}</div>}
    </div>
  );
}
