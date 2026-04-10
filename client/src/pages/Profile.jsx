import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { authAPI, employerAPI } from "../services/api";
import "../styles/profile.css";

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [employerStats, setEmployerStats] = useState({
    activeJobs: 0,
    totalApplicants: 0,
    closedJobs: 0,
  });

  const isEmployer = profile?.role === "employer";
  const isAdmin = profile?.role === "admin";

  const fallback = (value) => {
    if (!value) return <span className="profile-missing">Not provided</span>;
    return value;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await authAPI.getProfile();
        setProfile(data);
        setUser(data);

        if (data?.role === "employer") {
          const { data: statsData } = await employerAPI.getProfileStats();
          setEmployerStats({
            activeJobs: Number(statsData?.activeJobs || 0),
            totalApplicants: Number(statsData?.totalApplicants || 0),
            closedJobs: Number(statsData?.closedJobs || 0),
          });
        }
      } catch {
        setProfile(user);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [setUser, user]);

  const skills = Array.isArray(profile?.skills) ? profile.skills : [];

  const resumeName = profile?.resumeFile ? profile.resumeFile.split("/").pop() : null;
  const validIdName = profile?.validIdFile ? profile.validIdFile.split("/").pop() : null;
  const permitName = profile?.businessPermitUrl ? profile.businessPermitUrl.split("/").pop() : null;
  const registrationName = profile?.registrationDocUrl ? profile.registrationDocUrl.split("/").pop() : null;

  const resumeUrl = profile?.resumeFile ? `http://localhost:3000/${profile.resumeFile}` : null;
  const validIdUrl = profile?.validIdFile ? `http://localhost:3000/${profile.validIdFile}` : null;
  const permitUrl = profile?.businessPermitUrl ? `http://localhost:3000/${profile.businessPermitUrl}` : null;
  const registrationUrl = profile?.registrationDocUrl ? `http://localhost:3000/${profile.registrationDocUrl}` : null;

  const formatDate = (value) => {
    if (!value) return <span className="profile-missing">Not provided</span>;
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const verificationClass = useMemo(() => {
    const status = String(profile?.verificationStatus || "unverified").toLowerCase();
    if (status === "verified") return "verified";
    if (status === "pending") return "pending";
    return "unverified";
  }, [profile?.verificationStatus]);

  if (!profile && loading) return null;

  return (
    <div className="profile-view-page">
      <div className="profile-overlay"></div>

      <section className="profile-view-card">
        <header className="profile-view-header">
          <button className="profile-edit-btn" type="button" onClick={() => navigate("/profile/edit")}>
            Edit Profile
          </button>
          <div className="profile-view-avatar">
            {profile?.name ? profile.name.trim().charAt(0).toUpperCase() : "U"}
          </div>
          <h1>{profile?.name}</h1>

          {isAdmin ? (
            <span className="profile-role-admin">🛡️ System Administrator</span>
          ) : isEmployer ? (
            <>
              <p>{fallback(profile?.companyName)}</p>
              <span className="profile-role-employer">🏢 Employer Account</span>
            </>
          ) : (
            <>
              <p>{profile?.desiredJobTitle || <span className="profile-missing">Not provided</span>}</p>
              {profile?.availabilityStatus ? (
                <span className="profile-availability-badge">{profile.availabilityStatus}</span>
              ) : null}
            </>
          )}
        </header>

        {isAdmin ? (
          <>
            <div className="profile-view-section">
              <h2>Account Details</h2>
              <div className="profile-detail-row"><span>Email Address</span><strong>{fallback(profile?.email)}</strong></div>
              <div className="profile-detail-row"><span>Phone Number</span><strong>{fallback(profile?.phone)}</strong></div>
              <div className="profile-detail-row"><span>Date Joined</span><strong>{formatDate(profile?.createdAt)}</strong></div>
            </div>

            <div className="profile-view-section">
              <h2>System Access</h2>
              <div className="profile-detail-row"><span>Role</span><strong>Administrator</strong></div>
              <div className="profile-detail-row"><span>Access Level</span><strong>Full System Access</strong></div>
              <div className="profile-detail-row"><span>Account Status</span><strong>{profile?.isActive === false ? "Inactive" : "Active"}</strong></div>
            </div>
          </>
        ) : isEmployer ? (
          <>
            <div className="profile-view-section">
              <h2>Company Details</h2>
              <div className="profile-detail-row"><span>Email Address</span><strong>{fallback(profile?.email)}</strong></div>
              <div className="profile-detail-row"><span>Phone Number</span><strong>{fallback(profile?.phone)}</strong></div>
              <div className="profile-detail-row"><span>Business Address</span><strong>{fallback(profile?.businessAddress || profile?.address)}</strong></div>
              <div className="profile-detail-row"><span>Company Name</span><strong>{fallback(profile?.companyName)}</strong></div>
              <div className="profile-detail-row"><span>Industry / Sector</span><strong>{fallback(profile?.industry)}</strong></div>
              <div className="profile-detail-row"><span>Company Size</span><strong>{fallback(profile?.companySize)}</strong></div>
              <div className="profile-detail-row"><span>Website / Facebook Page</span><strong>{profile?.website ? <a href={profile.website} target="_blank" rel="noreferrer" className="profile-inline-link">{profile.website}</a> : <span className="profile-missing">Not provided</span>}</strong></div>
            </div>

            <div className="profile-view-section">
              <h2>Company Overview</h2>
              {profile?.companyDescription ? (
                <p className="profile-company-description">{profile.companyDescription}</p>
              ) : (
                <p className="profile-company-description profile-company-description--empty">
                  No company description added yet. <Link to="/profile/edit" className="profile-inline-link">Add Description</Link>
                </p>
              )}
            </div>

            <div className="profile-view-section">
              <h2>Posting Activity</h2>
              <div className="profile-stats-row">
                <article className="profile-stat-card">
                  <strong>{employerStats.activeJobs}</strong>
                  <span>Active Job Postings</span>
                </article>
                <article className="profile-stat-card">
                  <strong>{employerStats.totalApplicants}</strong>
                  <span>Total Applicants Received</span>
                </article>
                <article className="profile-stat-card">
                  <strong>{employerStats.closedJobs}</strong>
                  <span>Jobs Closed</span>
                </article>
              </div>
            </div>

            <div className="profile-view-section">
              <h2>Verification</h2>
              <div className="profile-detail-row profile-detail-row--document">
                <span>Business Permit</span>
                <strong>
                  {permitName ? permitName : <span className="profile-missing">No business permit uploaded</span>}
                  {permitUrl ? (
                    <a className="profile-doc-upload-btn" href={permitUrl} target="_blank" rel="noreferrer">Download</a>
                  ) : (
                    <button type="button" className="profile-doc-upload-btn" onClick={() => navigate("/profile/edit")}>Upload</button>
                  )}
                </strong>
              </div>
              <div className="profile-detail-row profile-detail-row--document">
                <span>DTI / SEC Registration</span>
                <strong>
                  {registrationName ? registrationName : <span className="profile-missing">No registration document uploaded</span>}
                  {registrationUrl ? (
                    <a className="profile-doc-upload-btn" href={registrationUrl} target="_blank" rel="noreferrer">Download</a>
                  ) : (
                    <button type="button" className="profile-doc-upload-btn" onClick={() => navigate("/profile/edit")}>Upload</button>
                  )}
                </strong>
              </div>
              <div className="profile-detail-row">
                <span>Verification Status</span>
                <strong>
                  <span className={`profile-verification-badge ${verificationClass}`}>
                    {verificationClass === "verified" ? "Verified ✓" : verificationClass === "pending" ? "Pending Review" : "Unverified"}
                  </span>
                </strong>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="profile-view-section">
              <h2>Personal Details</h2>
              <div className="profile-detail-row"><span>Email Address</span><strong>{fallback(profile?.email)}</strong></div>
              <div className="profile-detail-row"><span>Phone Number</span><strong>{fallback(profile?.phone)}</strong></div>
              <div className="profile-detail-row"><span>Date of Birth</span><strong>{formatDate(profile?.dateOfBirth)}</strong></div>
              <div className="profile-detail-row"><span>Gender</span><strong>{fallback(profile?.gender)}</strong></div>
              <div className="profile-detail-row"><span>Address / Location</span><strong>{fallback(profile?.address)}</strong></div>
            </div>

            <div className="profile-view-section">
              <h2>Skills</h2>
              <div className="profile-detail-row profile-detail-row--skills">
                <div className="profile-skills-list">
                  {skills.length > 0 ? (
                    skills.map((skill) => <span key={skill} className="profile-skill-tag">{skill}</span>)
                  ) : (
                    <span className="profile-missing">No skills added yet</span>
                  )}
                </div>
                {skills.length === 0 ? <Link to="/profile/edit" className="profile-inline-link">Add skills</Link> : null}
              </div>
            </div>

            <div className="profile-view-section">
              <h2>Work Background</h2>
              <div className="profile-detail-row"><span>Desired Position</span><strong>{fallback(profile?.desiredJobTitle)}</strong></div>
              <div className="profile-detail-row"><span>Educational Attainment</span><strong>{fallback(profile?.educationalAttainment)}</strong></div>
              <div className="profile-detail-row"><span>Work Experience</span><strong>{fallback(profile?.workExperience)}</strong></div>
              <div className="profile-detail-row">
                <span>Availability Status</span>
                <strong>{profile?.availabilityStatus ? <span className="profile-availability-badge">{profile.availabilityStatus}</span> : <span className="profile-missing">Not provided</span>}</strong>
              </div>
            </div>

            <div className="profile-view-section">
              <h2>Documents</h2>
              <div className="profile-detail-row profile-detail-row--document">
                <span>Resume</span>
                <strong>
                  {resumeName ? resumeName : <span className="profile-missing">No resume uploaded</span>}
                  {resumeUrl ? (
                    <a className="profile-doc-upload-btn" href={resumeUrl} target="_blank" rel="noreferrer">Download</a>
                  ) : (
                    <button type="button" className="profile-doc-upload-btn" onClick={() => navigate("/profile/edit")}>Upload</button>
                  )}
                </strong>
              </div>
              <div className="profile-detail-row profile-detail-row--document">
                <span>Valid ID</span>
                <strong>
                  {validIdName ? validIdName : <span className="profile-missing">No valid ID uploaded</span>}
                  {validIdUrl ? (
                    <a className="profile-doc-upload-btn" href={validIdUrl} target="_blank" rel="noreferrer">Download</a>
                  ) : (
                    <button type="button" className="profile-doc-upload-btn" onClick={() => navigate("/profile/edit")}>Upload</button>
                  )}
                </strong>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
