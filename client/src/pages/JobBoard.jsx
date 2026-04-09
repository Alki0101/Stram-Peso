import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobAPI } from "../services/api";
import "../styles/dashboard.css";
import Modal from "../components/Modal";
import AppModal from "../components/AppModal";

export default function JobBoard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [isEmployerModalOpen, setIsEmployerModalOpen] = useState(false);
  const [applications, setApplications] = useState([]);
  const [viewingApplication, setViewingApplication] = useState(null);
  const [editingApplication, setEditingApplication] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [editCoverLetter, setEditCoverLetter] = useState("");
  const [editResumeFile, setEditResumeFile] = useState(null);
  const [isUpdatingApplication, setIsUpdatingApplication] = useState(false);
  const [isDeletingApplication, setIsDeletingApplication] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const [jobsResponse, applicationsResponse] = await Promise.all([
          jobAPI.getJobs(),
          jobAPI.getMyApplications(),
        ]);
        setJobs(jobsResponse.data);
        setApplications(applicationsResponse.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  useEffect(() => {
    if (!toastMessage) return;

    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleViewJob = (job) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const handleApplyJob = (jobId) => {
    navigate(`/jobs/${jobId}`);
  };

  const handleViewEmployer = (job) => {
    const employer = job?.employer;
    if (!employer || typeof employer !== "object") return;
    setSelectedEmployer(employer);
    setIsEmployerModalOpen(true);
  };

  const getStatusClassName = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "open") return "status-open";
    if (normalized === "rejected") return "status-rejected";
    if (normalized === "applied" || normalized === "pending" || normalized === "reviewed") return "status-applied";
    return "status-open";
  };

  const formatAppliedDate = (appliedAt) => {
    if (!appliedAt) return "N/A";
    return new Date(appliedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getResumeUrl = (resumePath) => {
    if (!resumePath) return null;
    const sanitized = String(resumePath).replace(/\\/g, "/");
    return `http://localhost:3000/${sanitized}`;
  };

  const getEmployerDisplay = (employer) => {
    if (!employer || typeof employer !== "object") {
      return {
        accountName: "Unknown",
        companyName: "No company name",
      };
    }

    return {
      accountName: employer.name || "Unknown",
      companyName: employer.companyName || "No company name",
    };
  };

  const handleOpenEditModal = (application) => {
    setEditingApplication(application);
    setEditCoverLetter(application.coverLetter || "");
    setEditResumeFile(null);
  };

  const handleUpdateApplication = async (event) => {
    event.preventDefault();
    if (!editingApplication) return;

    setIsUpdatingApplication(true);
    try {
      const formData = new FormData();
      formData.append("coverLetter", editCoverLetter || "");
      if (editResumeFile) {
        formData.append("resume", editResumeFile);
      }

      const { data } = await jobAPI.updateApplication(editingApplication._id, formData);
      const updatedApplication = data?.application;

      if (updatedApplication) {
        setApplications((prev) =>
          prev.map((application) =>
            application._id === updatedApplication._id ? updatedApplication : application
          )
        );
      }

      setEditingApplication(null);
      setToastMessage({ text: "Application updated successfully!", type: "success" });
    } catch (err) {
      setToastMessage({ text: "Failed to update. Please try again.", type: "error" });
    } finally {
      setIsUpdatingApplication(false);
    }
  };

  const handleDeleteApplication = async (applicationId) => {
    setIsDeletingApplication(true);
    try {
      await jobAPI.deleteApplication(applicationId);
      setApplications((prev) => prev.filter((application) => application._id !== applicationId));
      setConfirmDeleteId(null);
      setToastMessage({ text: "Application withdrawn successfully!", type: "success" });
    } catch (err) {
      setToastMessage({ text: "Failed to withdraw. Please try again.", type: "error" });
    } finally {
      setIsDeletingApplication(false);
    }
  };

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="dashboard-container">
      <section className="jobboard-hero">
        <div className="jobboard-hero-content">
          <h1>Available Jobs in Marinduque</h1>
          <p>Browse open vacancies and apply with your resume.</p>

          <form className="jobboard-search" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title"
              aria-label="Search jobs by title"
            />
            <button type="submit">Search</button>
          </form>
        </div>
      </section>

      <div className="jobboard-sections">
        <div className="reports-section">
          <div className="jobboard-availability">{jobs.length} jobs available</div>

          {loading ? (
            <p className="loading">Loading jobs...</p>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : jobs.length === 0 ? (
            <div className="no-reports">
              <p>No job vacancies are available right now.</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="no-reports">
              <p>No jobs match your search.</p>
            </div>
          ) : (
            <div className="reports-list brand-reports-list">
              {filteredJobs.map((job) => (
                <div key={job._id} className="report-card brand-report-card">
                  <div className="report-header">
                    <h3>{job.title}</h3>
                    <span className="status-badge status-open">Open</span>
                  </div>
                  <p className="report-location">📍 {job.location}</p>
                  <div className="report-body">
                    <p className="report-description">{job.description}</p>
                  </div>
                  <div className="report-actions">
                    <button className="btn-view" onClick={() => handleViewJob(job)}>View Job</button>
                    <button className="btn-edit" onClick={() => handleApplyJob(job._id)}>Apply</button>
                    <button className="btn-employer-profile" onClick={() => handleViewEmployer(job)}>View Employer</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="section-heading jobboard-applications-title">Your Applications</h2>

          {applications.length === 0 ? (
            <p className="jobboard-applications-placeholder">You have not submitted any applications yet.</p>
          ) : (
            <div className="reports-list brand-reports-list">
              {applications.map((application) => (
                <div key={application._id} className="report-card brand-report-card">
                  <div className="report-header">
                    <h3>{application.vacancy?.title}</h3>
                    <span className={`status-badge ${getStatusClassName(application.status)}`}>{application.status}</span>
                  </div>
                  <p className="report-location">📍 {application.vacancy?.location}</p>
                  <p className="report-footer employer-line">
                    Employer Account:
                    <span className={application.vacancy?.employer?.name ? "employer-name" : "employer-name employer-name--unknown"}>
                      {getEmployerDisplay(application.vacancy?.employer).accountName}
                    </span>
                  </p>
                  <p className="report-footer employer-line">
                    Company:
                    <span className={application.vacancy?.employer?.companyName ? "employer-name" : "employer-name employer-name--unknown"}>
                      {getEmployerDisplay(application.vacancy?.employer).companyName}
                    </span>
                  </p>

                  {confirmDeleteId === application._id ? (
                    <div className="withdraw-confirm">
                      <p>Are you sure you want to withdraw this application?</p>
                      <div className="withdraw-confirm-actions">
                        <button
                          type="button"
                          className="btn-withdraw-confirm"
                          onClick={() => handleDeleteApplication(application._id)}
                          disabled={isDeletingApplication}
                        >
                          Yes, Withdraw
                        </button>
                        <button
                          type="button"
                          className="btn-withdraw-cancel"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isDeletingApplication}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="application-actions">
                      <button
                        type="button"
                        className="btn-app-view"
                        onClick={() => setViewingApplication(application)}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        className="btn-app-edit"
                        onClick={() => handleOpenEditModal(application)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-app-withdraw"
                        onClick={() => setConfirmDeleteId(application._id)}
                      >
                        Withdraw
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        job={selectedJob}
      />

      <AppModal
        isOpen={isEmployerModalOpen}
        onClose={() => setIsEmployerModalOpen(false)}
        title="Employer Profile"
      >
        {selectedEmployer && (
          <div className="application-modal-content">
            <p><strong>Employer Account:</strong> {selectedEmployer.name || "Unknown"}</p>
            <p><strong>Company Name:</strong> {selectedEmployer.companyName || "No company name"}</p>
            <p><strong>Email:</strong> {selectedEmployer.email || "Not provided"}</p>
            <p><strong>Phone:</strong> {selectedEmployer.phone || "Not provided"}</p>
            <p><strong>Industry:</strong> {selectedEmployer.industry || "Not provided"}</p>
            <p><strong>Company Size:</strong> {selectedEmployer.companySize || "Not provided"}</p>
            <p><strong>Business Address:</strong> {selectedEmployer.businessAddress || "Not provided"}</p>
            <p><strong>Website:</strong> {selectedEmployer.website || "Not provided"}</p>
            <p><strong>Description:</strong> {selectedEmployer.companyDescription || "No company description available."}</p>
          </div>
        )}
      </AppModal>

      <AppModal
        isOpen={Boolean(viewingApplication)}
        onClose={() => setViewingApplication(null)}
        title="Application Details"
      >
        {viewingApplication && (
          <div className="application-modal-content">
            <p><strong>Job Title:</strong> {viewingApplication.vacancy?.title || "N/A"}</p>
            <p><strong>Employer Account:</strong> {getEmployerDisplay(viewingApplication.vacancy?.employer).accountName}</p>
            <p><strong>Company:</strong> {getEmployerDisplay(viewingApplication.vacancy?.employer).companyName}</p>
            <p><strong>Location:</strong> {viewingApplication.vacancy?.location || "N/A"}</p>
            <p>
              <strong>Status:</strong>{" "}
              <span className={`status-badge ${getStatusClassName(viewingApplication.status)}`}>
                {viewingApplication.status}
              </span>
            </p>
            <p><strong>Cover Letter:</strong> {viewingApplication.coverLetter || "No cover letter submitted."}</p>
            <div className="employer-note-box">
              <p>
                <strong>Employer Note:</strong>{" "}
                {viewingApplication.employerNote
                  ? viewingApplication.employerNote
                  : "No note from employer yet."}
              </p>
              {viewingApplication.statusUpdatedAt ? (
                <p className="employer-note-date">
                  Last update: {formatAppliedDate(viewingApplication.statusUpdatedAt)}
                </p>
              ) : null}
            </div>
            <p>
              <strong>Resume:</strong>{" "}
              {viewingApplication.resume ? (
                <a
                  href={getResumeUrl(viewingApplication.resume)}
                  target="_blank"
                  rel="noreferrer"
                  className="resume-link"
                >
                  View Resume
                </a>
              ) : (
                "No resume uploaded."
              )}
            </p>
            <p><strong>Date applied:</strong> {formatAppliedDate(viewingApplication.appliedAt)}</p>
          </div>
        )}
      </AppModal>

      <AppModal
        isOpen={Boolean(editingApplication)}
        onClose={() => setEditingApplication(null)}
        title="Edit Application"
      >
        {editingApplication && (
          <form className="edit-application-form" onSubmit={handleUpdateApplication}>
            <label htmlFor="editCoverLetter">Cover Letter</label>
            <textarea
              id="editCoverLetter"
              value={editCoverLetter}
              onChange={(event) => setEditCoverLetter(event.target.value)}
              rows="6"
            />

            <label htmlFor="editResume">Resume</label>
            <input
              id="editResume"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(event) => setEditResumeFile(event.target.files?.[0] || null)}
            />
            <p className="current-file-name">
              {editResumeFile
                ? editResumeFile.name
                : editingApplication.resume
                  ? editingApplication.resume.split("/").pop()
                  : "No resume uploaded"}
            </p>

            <div className="edit-application-actions">
              <button type="submit" className="btn-save-changes" disabled={isUpdatingApplication}>
                {isUpdatingApplication ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="btn-cancel-edit"
                onClick={() => setEditingApplication(null)}
                disabled={isUpdatingApplication}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </AppModal>

      {toastMessage && (
        <div className={`app-toast app-toast--${toastMessage.type}`} role="status" aria-live="polite">
          {toastMessage.text}
        </div>
      )}
    </div>
  );
}
