import { useState } from "react";
import { employerAPI } from "../services/api";
import "../styles/dashboard.css";
import "../styles/post-job.css";
import { useNavigate } from "react-router-dom";

export default function PostJob() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    salary: "",
    jobType: "Full-time",
    slots: 1,
    requirements: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const trimmedData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        salary: formData.salary.trim(),
        jobType: formData.jobType,
        slots: Number(formData.slots) || 1,
        requirements: formData.requirements.trim(),
      };
      await employerAPI.createJob(trimmedData);
      alert("Job vacancy created successfully!");
      navigate("/employer");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create job vacancy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="profile-section">
          <div className="profile-avatar">JV</div>
          <div className="profile-info">
            <h1>Create Job Vacancy</h1>
            <p>Fill out the form below to post a new job vacancy.</p>
          </div>
        </div>
      </div>

      <div className="post-job-card">
        {error && <div className="error-message">{error}</div>}

        <p className="post-job-note">All fields are required unless marked optional.</p>

        <form className="post-job-form-grid" onSubmit={handleSubmit}>
          <div className="post-job-field post-job-field--full">
            <label htmlFor="title">Job Title</label>
            <input
              id="title"
              type="text"
              name="title"
              placeholder="e.g. Administrative Assistant"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="post-job-field post-job-field--full">
            <label htmlFor="description">Job Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe responsibilities, role scope, and expectations..."
              value={formData.description}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          <div className="post-job-field">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              type="text"
              name="location"
              placeholder="e.g. Boac, Marinduque"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>

          <div className="post-job-field">
            <label htmlFor="salary">Salary (optional)</label>
            <input
              id="salary"
              type="text"
              name="salary"
              placeholder="e.g. PHP 18,000"
              value={formData.salary}
              onChange={handleChange}
            />
          </div>

          <div className="post-job-field">
            <label htmlFor="jobType">Job Type</label>
            <select id="jobType" name="jobType" value={formData.jobType} onChange={handleChange}>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          <div className="post-job-field">
            <label htmlFor="slots">Slots Available</label>
            <input
              id="slots"
              type="number"
              min="1"
              name="slots"
              value={formData.slots}
              onChange={handleChange}
              required
            />
          </div>

          <div className="post-job-field post-job-field--full">
            <label htmlFor="requirements">Requirements</label>
            <textarea
              id="requirements"
              name="requirements"
              placeholder="e.g. Bachelor's degree, 2 years experience..."
              value={formData.requirements}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          <div className="post-job-field post-job-field--full">
            <button className="post-job-submit" type="submit" disabled={loading}>
              {loading ? "Posting..." : "Post Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}