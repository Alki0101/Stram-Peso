import React from "react";
import "../styles/modal.css";

export default function Modal({ isOpen, onClose, job }) {
  if (!isOpen || !job) return null;

  return (
    <div
      className="job-dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="job-dialog-card" role="dialog" aria-modal="true" aria-label="Job details">
        <button className="job-dialog-close" onClick={onClose} type="button" aria-label="Close">
          x
        </button>

        <div className="job-dialog-hero">
          <h2>{job.title}</h2>
          <span className="job-dialog-status">Open</span>
        </div>

        <div className="job-dialog-meta">
          <span className="job-dialog-chip">Location: {job.location || "Not specified"}</span>
          <span className="job-dialog-chip">Salary: {job.salary || "Salary negotiable"}</span>
        </div>

        <div className="job-dialog-section">
          <h3>About this job</h3>
          <p>{job.description || "No description provided."}</p>
        </div>
      </div>
    </div>
  );
}