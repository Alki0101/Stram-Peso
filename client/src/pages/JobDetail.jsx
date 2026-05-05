import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { jobAPI } from "../services/api";
import "../styles/report.css";
import AppModal from "../components/AppModal";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const { data } = await jobAPI.getJobById(id);
        setJob(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load job details");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const formatDate = (value) => {
    if (!value) return "Not specified";
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleApplyClick = async (e) => {
    e.preventDefault();

    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }
      formData.append("coverLetter", coverLetter);
      await jobAPI.applyToJob(id, formData);
      setSuccessMessage("Application submitted successfully!");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthLogin = () => {
    setShowAuthPrompt(false);
    navigate("/login");
  };

  const handleAuthRegister = () => {
    setShowAuthPrompt(false);
    navigate("/register");
  };

  const employerName = job?.employer?.companyName || job?.employer?.name || "Employer";
  const employerDescription = job?.employer?.companyDescription || "No employer description provided.";

  const handleSubmit = async (e) => {
    handleApplyClick(e);
  };

  if (loading) return <div className="report-container"><p>Loading job details...</p></div>;

  if (error) return <div className="report-container"><div className="error-message">{error}</div></div>;

  if (!job) return <div className="report-container"><p>Job not found.</p></div>;

  return (
    <div className="job-detail-page">
      <section className="job-hero">
        <div className="job-hero-inner">
          <h1>{job.title}</h1>
          <div className="job-hero-meta">
            <span className="job-chip">{job.location}</span>
            <span className="job-chip">{job.jobType || "Full-time"}</span>
            <span className="job-chip">{job.salary || "Salary negotiable"}</span>
          </div>
        </div>
      </section>

      <div className="job-detail-layout">
        <main className="job-main-column">
          <section className="job-section">
            <h2>{job.title}</h2>
            <div className="job-info-chips">
              <span className="job-chip job-chip-outline">{job.location}</span>
              <span className="job-chip job-chip-outline">{job.jobType || "Full-time"}</span>
              <span className="job-chip job-chip-outline">{job.salary || "Salary negotiable"}</span>
              <span className="job-chip job-chip-outline">{job.slots || 1} opening{Number(job.slots) === 1 ? "" : "s"}</span>
            </div>
          </section>

          <section className="job-section">
            <h3>About the Job</h3>
            <p className="job-description-text">{job.description}</p>
          </section>

          <section className="job-section">
            <h3>Qualifications / Requirements</h3>
            <p className="job-description-text">{job.requirements || "No requirements provided."}</p>
          </section>

          <section className="job-section">
            <h3>Job Details</h3>
            <div className="job-details-grid">
              <div className="job-detail-item">
                <span className="job-detail-label">Date Posted</span>
                <strong>{formatDate(job.createdAt)}</strong>
              </div>
              <div className="job-detail-item">
                <span className="job-detail-label">Application Deadline</span>
                <strong>{formatDate(job.applicationDeadline)}</strong>
              </div>
              <div className="job-detail-item">
                <span className="job-detail-label">Number of Vacancies</span>
                <strong>{Number(job.slots || 1)}</strong>
              </div>
              <div className="job-detail-item">
                <span className="job-detail-label">Applications</span>
                <strong>{Number(job.applicationCount || 0)}</strong>
              </div>
            </div>
          </section>

          <section className="employer-card">
            <h3>Employer Info</h3>
            <p><strong>Company:</strong> {employerName}</p>
            <p><strong>Employer Name:</strong> {job.employer?.name || "Not provided"}</p>
            <p><strong>Description:</strong> {employerDescription}</p>
            <p><strong>Verification:</strong> {job.employer?.verificationStatus || "Not provided"}</p>
          </section>
        </main>

        <aside className="job-apply-column">
          <div className="apply-card">
            <h3>Apply for this Position</h3>
            {!user ? <p className="apply-card-note">Please log in or register to apply for this job.</p> : null}
            <form onSubmit={handleSubmit} className="apply-form">
              {user ? (
                <>
                  <div className="form-group">
                    <label htmlFor="coverLetter">Cover Letter</label>
                    <textarea
                      id="coverLetter"
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows="6"
                      placeholder="Tell the employer why you're a good fit"
                      className="form-control"
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label htmlFor="resume">Upload Resume</label>
                    <input
                      id="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setResumeFile(e.target.files[0])}
                      className="file-input"
                    />
                    <label htmlFor="resume" className="file-input-label">Choose File</label>
                    <p className="file-name">{resumeFile ? resumeFile.name : "No file selected"}</p>
                  </div>
                </>
              ) : null}

              <div className="form-group">
                <button type="submit" disabled={submitting} className="btn-apply">
                  {submitting ? "Applying..." : "Apply Now"}
                </button>
              </div>

              {successMessage && <p className="feedback-success">{successMessage}</p>}
              {error && <p className="feedback-error">{error}</p>}
            </form>
          </div>
        </aside>
      </div>

      <AppModal
        isOpen={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        title="Login required"
      >
        <p className="job-auth-modal-copy">Please log in or register to apply for this job.</p>
        <div className="job-auth-modal-actions">
          <button type="button" className="green-btn" onClick={handleAuthLogin}>
            Login
          </button>
          <button type="button" className="outline-btn" onClick={handleAuthRegister}>
            Register
          </button>
        </div>
      </AppModal>
    </div>
  );
}
