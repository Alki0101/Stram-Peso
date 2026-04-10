import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { authAPI } from "../services/api";
import "../styles/profile.css";

export default function EditProfile() {
  const { user, login, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const isEmployer = user?.role === "employer";
  const isAdmin = user?.role === "admin";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    about: "",
    phone: "",
    address: "",
    businessAddress: "",
    dateOfBirth: "",
    gender: "",
    desiredJobTitle: "",
    workExperience: "",
    educationalAttainment: "",
    availabilityStatus: "",
    companyName: "",
    industry: "",
    companySize: "",
    website: "",
    companyDescription: "",
  });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [supportingDocumentFile, setSupportingDocumentFile] = useState(null);
  const [businessPermitFile, setBusinessPermitFile] = useState(null);
  const [registrationDocFile, setRegistrationDocFile] = useState(null);
  const [existingResume, setExistingResume] = useState("");
  const [existingValidId, setExistingValidId] = useState("");
  const [existingBusinessPermit, setExistingBusinessPermit] = useState("");
  const [existingRegistrationDoc, setExistingRegistrationDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await authAPI.getProfile();
        setFormData({
          name: data.name || "",
          email: data.email || "",
          about: data.about || "",
          phone: data.phone || "",
          address: data.address || "",
          businessAddress: data.businessAddress || data.address || "",
          dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : "",
          gender: data.gender || "",
          desiredJobTitle: data.desiredJobTitle || "",
          workExperience: data.workExperience || "",
          educationalAttainment: data.educationalAttainment || "",
          availabilityStatus: data.availabilityStatus || "",
          companyName: data.companyName || "",
          industry: data.industry || "",
          companySize: data.companySize || "",
          website: data.website || "",
          companyDescription: data.companyDescription || "",
        });
        setSkills(Array.isArray(data.skills) ? data.skills : []);
        setExistingResume(data.resumeFile || "");
        setExistingValidId(data.validIdFile || "");
        setExistingBusinessPermit(data.businessPermitUrl || "");
        setExistingRegistrationDoc(data.registrationDocUrl || "");
      } catch (err) {
        if (user) {
          setFormData((prev) => ({
            ...prev,
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
            address: user.address || "",
            businessAddress: user.businessAddress || user.address || "",
            companyName: user.companyName || "",
            industry: user.industry || "",
            companySize: user.companySize || "",
            website: user.website || "",
            companyDescription: user.companyDescription || "",
          }));
          setSkills(Array.isArray(user.skills) ? user.skills : []);
        }
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleAddSkill = () => {
    const value = skillInput.trim();
    if (!value) return;
    if (skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      setSkillInput("");
      return;
    }
    setSkills((prev) => [...prev, value]);
    setSkillInput("");
  };

  const handleSkillKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddSkill();
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills((prev) => prev.filter((skill) => skill !== skillToRemove));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("email", formData.email);
      data.append("phone", formData.phone);

      if (isAdmin) {
        if (currentPassword || newPassword || confirmPassword) {
          if (!currentPassword || !newPassword) {
            throw new Error("Current password and new password are required");
          }

          if (newPassword !== confirmPassword) {
            throw new Error("New password and confirm password do not match");
          }

          data.append("currentPassword", currentPassword);
          data.append("newPassword", newPassword);
        }
      } else if (isEmployer) {
        data.append("dateOfBirth", formData.dateOfBirth);
        data.append("gender", formData.gender);
        data.append("companyName", formData.companyName);
        data.append("industry", formData.industry);
        data.append("companySize", formData.companySize);
        data.append("website", formData.website);
        data.append("companyDescription", formData.companyDescription);
        data.append("businessAddress", formData.businessAddress);

        if (businessPermitFile) {
          data.append("businessPermit", businessPermitFile);
        }

        if (registrationDocFile) {
          data.append("registrationDoc", registrationDocFile);
        }
      } else {
        data.append("dateOfBirth", formData.dateOfBirth);
        data.append("gender", formData.gender);
        data.append("about", formData.about);
        data.append("address", formData.address);
        data.append("desiredJobTitle", formData.desiredJobTitle);
        data.append("workExperience", formData.workExperience);
        data.append("educationalAttainment", formData.educationalAttainment);
        data.append("availabilityStatus", formData.availabilityStatus);
        data.append("skills", JSON.stringify(skills));

        if (resumeFile) {
          data.append("resumeFile", resumeFile);
        }

        if (supportingDocumentFile) {
          data.append("validIdFile", supportingDocumentFile);
        }
      }

      const { data: response } = await authAPI.updateProfile(data);
      setMessage(response.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      login(localStorage.getItem("token"), response.user);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const expectedFullName = formData.name || user?.name || "";
  const isDeleteNameMatch = deleteConfirmName === expectedFullName;

  const handleDeleteAccount = async () => {
    setDeleteError("");
    setIsDeleting(true);

    try {
      await authAPI.deleteAccount();
      logout();
      window.alert("Your account has been deleted.");
      navigate("/");
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirmName("");
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setDeleteError("");
  };

  return (
    <div className="profile-page">
      <div className="profile-overlay"></div>

      <form className="profile-form-card" onSubmit={handleSubmit}>
        <div className="profile-avatar-wrap">
          <label htmlFor="profileUpload" className="profile-avatar-circle" title="Profile Avatar">
            {formData.name ? formData.name.trim().charAt(0).toUpperCase() : "U"}
          </label>
        </div>

        <h2 className="profile-title">Edit Profile</h2>

        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}

        <div className="profile-fields">
          <div className="profile-field">
            <label htmlFor="name">Full Name</label>
            <input id="name" type="text" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div className="profile-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>

          <div className="profile-field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" type="text" name="phone" value={formData.phone} onChange={handleChange} />
          </div>

          {isAdmin ? (
            <>
              <div className="profile-section-divider">Password Change</div>

              <div className="profile-field">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="profile-field profile-field-grid">
                <div>
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="profile-field profile-field-grid">
              <div>
                <label htmlFor="dateOfBirth">Date of Birth</label>
                <input id="dateOfBirth" type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="gender">Gender</label>
                <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          )}

          {!isAdmin && isEmployer ? (
            <>
              <div className="profile-section-divider">Company Profile</div>

              <div className="profile-field">
                <label htmlFor="companyName">Company Name</label>
                <input id="companyName" type="text" name="companyName" value={formData.companyName} onChange={handleChange} />
              </div>

              <div className="profile-field profile-field-grid">
                <div>
                  <label htmlFor="industry">Industry / Sector</label>
                  <select id="industry" name="industry" value={formData.industry} onChange={handleChange}>
                    <option value="">Select Industry</option>
                    <option value="Retail">Retail</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Government">Government</option>
                    <option value="NGO">NGO</option>
                    <option value="Technology">Technology</option>
                    <option value="Hospitality">Hospitality</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Education">Education</option>
                    <option value="Healthcare">Healthcare</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="companySize">Company Size</label>
                  <select id="companySize" name="companySize" value={formData.companySize} onChange={handleChange}>
                    <option value="">Select Size</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="200+">200+</option>
                  </select>
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor="website">Website / Facebook Page</label>
                <input id="website" type="url" name="website" value={formData.website} onChange={handleChange} placeholder="https://..." />
              </div>

              <div className="profile-field">
                <label htmlFor="businessAddress">Business Address</label>
                <input id="businessAddress" type="text" name="businessAddress" value={formData.businessAddress} onChange={handleChange} />
              </div>

              <div className="profile-field">
                <label htmlFor="companyDescription">Company Description</label>
                <textarea id="companyDescription" name="companyDescription" value={formData.companyDescription} onChange={handleChange} rows="4" />
              </div>

              <div className="profile-section-divider">Verification Documents</div>

              <div className="profile-field">
                <label htmlFor="businessPermitUpload">Business Permit</label>
                <input
                  id="businessPermitUpload"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(event) => setBusinessPermitFile(event.target.files[0])}
                  className="profile-file-input"
                />
                <label htmlFor="businessPermitUpload" className="profile-upload-zone">
                  <span className="upload-icon" aria-hidden="true">↑</span>
                  <span>Upload Business Permit</span>
                </label>
                <p className="profile-file-name">
                  {businessPermitFile ? businessPermitFile.name : existingBusinessPermit ? existingBusinessPermit.split("/").pop() : "No business permit uploaded"}
                </p>
              </div>

              <div className="profile-field">
                <label htmlFor="registrationDocUpload">DTI / SEC Registration</label>
                <input
                  id="registrationDocUpload"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(event) => setRegistrationDocFile(event.target.files[0])}
                  className="profile-file-input"
                />
                <label htmlFor="registrationDocUpload" className="profile-upload-zone">
                  <span className="upload-icon" aria-hidden="true">↑</span>
                  <span>Upload Registration Document</span>
                </label>
                <p className="profile-file-name">
                  {registrationDocFile ? registrationDocFile.name : existingRegistrationDoc ? existingRegistrationDoc.split("/").pop() : "No registration document uploaded"}
                </p>
              </div>
            </>
          ) : !isAdmin ? (
            <>
              <div className="profile-field">
                <label htmlFor="address">Address</label>
                <input id="address" type="text" name="address" value={formData.address} onChange={handleChange} />
              </div>

              <div className="profile-field">
                <label htmlFor="about">About You</label>
                <textarea id="about" name="about" value={formData.about} onChange={handleChange} rows="4" />
              </div>

              <div className="profile-section-divider">Job Seeker Details</div>

              <div className="profile-field">
                <label htmlFor="desiredJobTitle">Desired Job Title</label>
                <input id="desiredJobTitle" type="text" name="desiredJobTitle" value={formData.desiredJobTitle} onChange={handleChange} />
              </div>

              <div className="profile-field">
                <label htmlFor="skills">Skills</label>
                <div className="skills-input-row">
                  <input
                    id="skills"
                    type="text"
                    value={skillInput}
                    onChange={(event) => setSkillInput(event.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    placeholder="Add a skill and press Enter"
                  />
                  <button type="button" className="skill-add-btn" onClick={handleAddSkill}>Add</button>
                </div>
                <div className="skills-tags-wrap">
                  {skills.map((skill) => (
                    <span key={skill} className="skill-tag">
                      {skill}
                      <button type="button" onClick={() => handleRemoveSkill(skill)} aria-label={`Remove ${skill}`}>
                        x
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor="workExperience">Work Experience</label>
                <select id="workExperience" name="workExperience" value={formData.workExperience} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="Fresh Graduate">Fresh Graduate</option>
                  <option value="Less than 1 year">Less than 1 year</option>
                  <option value="1–3 years">1–3 years</option>
                  <option value="3–5 years">3–5 years</option>
                  <option value="5+ years">5+ years</option>
                </select>
              </div>

              <div className="profile-field">
                <label htmlFor="educationalAttainment">Educational Attainment</label>
                <select id="educationalAttainment" name="educationalAttainment" value={formData.educationalAttainment} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="Elementary Graduate">Elementary Graduate</option>
                  <option value="High School Graduate">High School Graduate</option>
                  <option value="Senior High School Graduate">Senior High School Graduate</option>
                  <option value="Vocational / TESDA">Vocational / TESDA</option>
                  <option value="College Undergraduate">College Undergraduate</option>
                  <option value="College Graduate">College Graduate</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="Doctorate">Doctorate</option>
                </select>
              </div>

              <div className="profile-field">
                <label htmlFor="availabilityStatus">Availability Status</label>
                <select id="availabilityStatus" name="availabilityStatus" value={formData.availabilityStatus} onChange={handleChange}>
                  <option value="">Select status</option>
                  <option value="Actively Looking">Actively Looking</option>
                  <option value="Open to Offers">Open to Offers</option>
                  <option value="Currently Employed">Currently Employed</option>
                </select>
              </div>

              <div className="profile-section-divider">Documents</div>

              <div className="profile-field">
                <label htmlFor="profileUpload">Resume</label>
                <input
                  id="profileUpload"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(event) => setResumeFile(event.target.files[0])}
                  className="profile-file-input"
                />
                <label htmlFor="profileUpload" className="profile-upload-zone">
                  <span className="upload-icon" aria-hidden="true">↑</span>
                  <span>Upload Resume</span>
                </label>
                <p className="profile-file-name">{resumeFile ? resumeFile.name : existingResume ? existingResume.split("/").pop() : "No file selected"}</p>
              </div>

              <div className="profile-field">
                <label htmlFor="supportingUpload">Valid ID / Supporting Documents</label>
                <input
                  id="supportingUpload"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(event) => setSupportingDocumentFile(event.target.files[0])}
                  className="profile-file-input"
                />
                <label htmlFor="supportingUpload" className="profile-upload-zone">
                  <span className="upload-icon" aria-hidden="true">↑</span>
                  <span>Upload Valid ID</span>
                </label>
                <p className="profile-file-name">{supportingDocumentFile ? supportingDocumentFile.name : existingValidId ? existingValidId.split("/").pop() : "No file selected"}</p>
              </div>
            </>
          ) : null}
        </div>

        <button type="submit" disabled={loading} className="profile-save-btn">
          {loading ? "Saving..." : "Save Profile"}
        </button>

        <section className="danger-zone-section">
          <div className="danger-zone-divider"></div>
          <p className="danger-zone-label">Danger Zone</p>
          <p className="danger-zone-description">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button type="button" className="danger-zone-delete-btn" onClick={openDeleteModal}>
            Delete My Account
          </button>
        </section>
      </form>

      {showDeleteModal && (
        <div className="delete-account-modal-overlay" onClick={closeDeleteModal}>
          <div className="delete-account-modal" onClick={(event) => event.stopPropagation()}>
            <div className="delete-warning-icon" aria-hidden="true">!</div>
            <h3>Delete your account?</h3>
            <p>
              This will permanently delete your profile, skills, documents, and all job applications. This cannot be undone.
            </p>

            <label htmlFor="delete-name-confirm" className="delete-confirm-label">
              Type your full name to confirm:
            </label>
            <input
              id="delete-name-confirm"
              type="text"
              className="delete-confirm-input"
              value={deleteConfirmName}
              onChange={(event) => setDeleteConfirmName(event.target.value)}
              placeholder={expectedFullName || "Enter your full name"}
              disabled={isDeleting}
            />

            {deleteError && <p className="delete-modal-error">{deleteError}</p>}

            <div className="delete-account-modal-actions">
              <button type="button" className="delete-cancel-btn" onClick={closeDeleteModal} disabled={isDeleting}>
                Cancel
              </button>
              <button
                type="button"
                className="delete-confirm-btn"
                onClick={handleDeleteAccount}
                disabled={!isDeleteNameMatch || isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
