import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { authAPI } from "../services/api";
import "../styles/onboarding.css";

const suggestedSkills = [
  "Computer Literacy",
  "Driving",
  "Cooking",
  "Carpentry",
  "Caregiving",
  "Typing",
  "Customer Service",
];

export default function Onboarding() {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    dateOfBirth: user?.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : "",
    gender: user?.gender || "",
    address: user?.address || "",
    desiredJobTitle: user?.desiredJobTitle || "",
    educationalAttainment: user?.educationalAttainment || "",
    workExperience: user?.workExperience || "",
    availabilityStatus: user?.availabilityStatus || "",
  });

  const [skills, setSkills] = useState(Array.isArray(user?.skills) ? user.skills : []);
  const [skillInput, setSkillInput] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [validIdFile, setValidIdFile] = useState(null);

  const progress = useMemo(() => {
    const capped = Math.min(step, 4);
    return (capped / 4) * 100;
  }, [step]);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addSkill = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (skills.some((skill) => skill.toLowerCase() === trimmed.toLowerCase())) return;
    setSkills((prev) => [...prev, trimmed]);
  };

  const handleAddSkill = () => {
    addSkill(skillInput);
    setSkillInput("");
  };

  const handleSkillKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddSkill();
    }
  };

  const handleNext = () => {
    setError("");
    if (step === 2 && skills.length < 1) {
      setError("Please add at least one skill before continuing.");
      return;
    }
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const submitProfile = async ({ skipDocs = false } = {}) => {
    setSaving(true);
    setError("");
    try {
      const data = new FormData();
      data.append("name", form.name || "");
      data.append("phone", form.phone || "");
      data.append("dateOfBirth", form.dateOfBirth || "");
      data.append("gender", form.gender || "");
      data.append("address", form.address || "");
      data.append("desiredJobTitle", form.desiredJobTitle || "");
      data.append("educationalAttainment", form.educationalAttainment || "");
      data.append("workExperience", form.workExperience || "");
      data.append("availabilityStatus", form.availabilityStatus || "");
      data.append("skills", JSON.stringify(skills));
      data.append("onboardingComplete", "true");

      if (!skipDocs) {
        if (resumeFile) data.append("resumeFile", resumeFile);
        if (validIdFile) data.append("validIdFile", validIdFile);
      }

      const { data: response } = await authAPI.updateProfile(data);
      const token = localStorage.getItem("token");
      if (token) {
        login(token, response.user);
      }
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete onboarding.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-overlay"></div>

      <section className="onboarding-card">
        {step <= 4 && (
          <>
            <div className="onboarding-progress-meta">Step {step} of 4</div>
            <div className="onboarding-progress-track">
              <div className="onboarding-progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </>
        )}

        {error && <div className="onboarding-error">{error}</div>}

        {step === 1 && (
          <div className="onboarding-step">
            <h2>Personal Details</h2>
            <div className="onboarding-fields">
              <label>
                Full Name
                <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
              </label>
              <label>
                Phone Number
                <input type="text" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </label>
              <label>
                Date of Birth
                <input type="date" value={form.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} />
              </label>
              <div>
                <span className="onboarding-label">Gender</span>
                <div className="pill-row">
                  {["Male", "Female", "Prefer not to say"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`pill-btn ${form.gender === option ? "active" : ""}`}
                      onClick={() => updateField("gender", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <label>
                Home Address / Municipality
                <input type="text" value={form.address} onChange={(e) => updateField("address", e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h2>What are your skills?</h2>
            <div className="skills-entry-row">
              <input
                type="text"
                value={skillInput}
                placeholder="Type a skill and press Enter"
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
              />
              <button type="button" className="onboarding-add-btn" onClick={handleAddSkill}>Add</button>
            </div>
            <div className="skills-tags-wrap">
              {skills.map((skill) => (
                <span key={skill} className="skill-pill">
                  {skill}
                  <button type="button" onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}>x</button>
                </span>
              ))}
            </div>
            <p className="onboarding-hint">Suggestions:</p>
            <div className="suggestions-row">
              {suggestedSkills.map((skill) => (
                <button key={skill} type="button" className="suggestion-chip" onClick={() => addSkill(skill)}>
                  {skill}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <h2>Work Background</h2>
            <div className="onboarding-fields">
              <label>
                Desired Job Title
                <input type="text" value={form.desiredJobTitle} onChange={(e) => updateField("desiredJobTitle", e.target.value)} />
              </label>
              <label>
                Educational Attainment
                <select value={form.educationalAttainment} onChange={(e) => updateField("educationalAttainment", e.target.value)}>
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
              </label>
              <label>
                Work Experience
                <select value={form.workExperience} onChange={(e) => updateField("workExperience", e.target.value)}>
                  <option value="">Select</option>
                  <option value="Fresh Graduate">Fresh Graduate</option>
                  <option value="Less than 1 year">Less than 1 year</option>
                  <option value="1–3 years">1–3 years</option>
                  <option value="3–5 years">3–5 years</option>
                  <option value="5+ years">5+ years</option>
                </select>
              </label>
              <div>
                <span className="onboarding-label">Availability Status</span>
                <div className="pill-row">
                  {["Actively Looking", "Open to Offers", "Currently Employed"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`pill-btn ${form.availabilityStatus === option ? "active" : ""}`}
                      onClick={() => updateField("availabilityStatus", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="onboarding-step">
            <h2>Upload Documents</h2>
            <div className="onboarding-fields">
              <label>
                Resume upload (PDF/DOC)
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
              </label>
              <label>
                Valid ID upload
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setValidIdFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <button type="button" className="skip-link" onClick={() => submitProfile({ skipDocs: true })} disabled={saving}>
              Skip for now
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="onboarding-step onboarding-success-step">
            <div className="success-icon">✓</div>
            <h2>You're all set, {form.name || "Job Seeker"}!</h2>
            <p>Your profile is ready.</p>
            <div className="onboarding-nav">
              <button type="button" className="onboarding-primary" onClick={() => navigate("/profile")}>View My Profile</button>
              <button type="button" className="onboarding-secondary" onClick={() => navigate("/jobs")}>Browse Jobs</button>
            </div>
          </div>
        )}

        {step <= 4 && (
          <div className="onboarding-nav">
            <button type="button" className="onboarding-secondary" onClick={handleBack} disabled={step === 1 || saving}>
              Back
            </button>
            {step < 4 ? (
              <button type="button" className="onboarding-primary" onClick={handleNext}>
                Next
              </button>
            ) : (
              <button type="button" className="onboarding-primary" onClick={() => submitProfile()} disabled={saving}>
                {saving ? "Finishing..." : "Finish Setup"}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
