import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { usersAPI } from "../../services/api";

const industries = [
  "Retail",
  "Manufacturing",
  "Government",
  "Healthcare",
  "Education",
  "NGO / Non-profit",
  "Agriculture",
  "Technology",
  "Construction",
  "Transportation",
  "Hospitality",
  "Other",
];

const companySizes = ["1-10", "11-50", "51-200", "200+"];

export default function EmployerOnboarding() {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    companyName: user?.companyName || user?.name || "",
    industry: user?.industry || "",
    companySize: user?.companySize || "",
    businessAddress: user?.businessAddress || user?.address || "",
    phone: user?.phone || "",
    website: user?.website || "",
    companyDescription: user?.companyDescription || "",
  });

  const progress = useMemo(() => {
    if (step === 1) return 33;
    if (step === 2) return 66;
    return 100;
  }, [step]);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateStep1 = () => {
    const nextErrors = {};

    if (!form.companyName.trim()) nextErrors.companyName = "Company name is required";
    if (!form.industry.trim()) nextErrors.industry = "Please select an industry";
    if (!form.companySize.trim()) nextErrors.companySize = "Please select a company size";
    if (!form.businessAddress.trim()) nextErrors.businessAddress = "Business address is required";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateStep2 = () => {
    const nextErrors = {};

    if (!form.phone.trim()) nextErrors.phone = "Phone number is required";
    if (!form.companyDescription.trim()) {
      nextErrors.companyDescription = "Please add a short company description";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setSubmitError("");
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setSubmitError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const submitOnboarding = async () => {
    setSubmitError("");
    setSaving(true);

    try {
      const payload = {
        companyName: form.companyName.trim(),
        industry: form.industry,
        companySize: form.companySize,
        businessAddress: form.businessAddress.trim(),
        website: form.website.trim(),
        companyDescription: form.companyDescription.trim(),
        phone: form.phone.trim(),
      };

      const { data } = await usersAPI.completeOnboarding(payload);
      const token = localStorage.getItem("token");

      if (token) {
        login(token, data.user);
      }

      navigate("/employer-dashboard");
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to complete onboarding. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="onboarding-card">
      <div className="onboarding-progress-meta">STEP {step} OF 3</div>
      <div className="onboarding-progress-track">
        <div className="onboarding-progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      {step === 1 && (
        <div className="onboarding-step">
          <h2>Tell us about your company</h2>
          <p className="onboarding-subtitle">This helps job seekers learn about who you are.</p>

          <div className="onboarding-fields">
            <label>
              Company Name
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
              />
              {errors.companyName && <span className="onboarding-field-error">{errors.companyName}</span>}
            </label>

            <label>
              Industry / Sector
              <select value={form.industry} onChange={(e) => updateField("industry", e.target.value)}>
                <option value="">Select industry</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
              {errors.industry && <span className="onboarding-field-error">{errors.industry}</span>}
            </label>

            <div>
              <span className="onboarding-label">Company Size</span>
              <div className="pill-row">
                {companySizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`pill-btn ${form.companySize === size ? "active" : ""}`}
                    onClick={() => updateField("companySize", size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {errors.companySize && <span className="onboarding-field-error">{errors.companySize}</span>}
            </div>

            <label>
              Business Address
              <input
                type="text"
                placeholder="e.g. Boac, Marinduque"
                value={form.businessAddress}
                onChange={(e) => updateField("businessAddress", e.target.value)}
              />
              {errors.businessAddress && <span className="onboarding-field-error">{errors.businessAddress}</span>}
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="onboarding-step">
          <h2>How can applicants reach you?</h2>
          <p className="onboarding-subtitle">Provide your contact details and optional online presence.</p>

          <div className="onboarding-fields">
            <label>
              Phone Number
              <input type="text" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              {errors.phone && <span className="onboarding-field-error">{errors.phone}</span>}
            </label>

            <label>
              Website / Facebook Page
              <input
                type="url"
                placeholder="https://facebook.com/yourcompany"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
              />
            </label>

            <label>
              Company Description
              <textarea
                className="onboarding-textarea"
                placeholder="Briefly describe what your company does, your mission, and what makes you a great employer..."
                value={form.companyDescription}
                onChange={(e) => updateField("companyDescription", e.target.value.slice(0, 300))}
              />
              {errors.companyDescription && (
                <span className="onboarding-field-error">{errors.companyDescription}</span>
              )}
              <span className="onboarding-char-counter">{form.companyDescription.length} / 300 characters</span>
            </label>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="onboarding-step">
          <h2>You're almost ready!</h2>
          <p className="onboarding-subtitle">Review your details before finishing setup.</p>

          <div className="onboarding-summary-card">
            <div className="onboarding-summary-row">
              <span className="onboarding-summary-label">Company Name</span>
              <span className="onboarding-summary-value">{form.companyName || "-"}</span>
            </div>
            <div className="onboarding-summary-row">
              <span className="onboarding-summary-label">Industry</span>
              <span className="onboarding-summary-value">{form.industry || "-"}</span>
            </div>
            <div className="onboarding-summary-row">
              <span className="onboarding-summary-label">Company Size</span>
              <span className="onboarding-summary-value">{form.companySize || "-"}</span>
            </div>
            <div className="onboarding-summary-row">
              <span className="onboarding-summary-label">Business Address</span>
              <span className="onboarding-summary-value">{form.businessAddress || "-"}</span>
            </div>
            <div className="onboarding-summary-row">
              <span className="onboarding-summary-label">Phone Number</span>
              <span className="onboarding-summary-value">{form.phone || "-"}</span>
            </div>
            <div className="onboarding-summary-row">
              <span className="onboarding-summary-label">Website</span>
              <span className="onboarding-summary-value">{form.website || "-"}</span>
            </div>
            <div className="onboarding-summary-row">
              <span className="onboarding-summary-label">Description</span>
              <span className="onboarding-summary-value">{form.companyDescription || "-"}</span>
            </div>
          </div>

          <div className="onboarding-review-links">
            <button type="button" className="onboarding-edit-link" onClick={() => setStep(1)}>
              {"<- Edit company information"}
            </button>
            <button type="button" className="onboarding-edit-link" onClick={() => setStep(2)}>
              {"<- Edit contact details"}
            </button>
          </div>

          <div className="onboarding-info-box">
            <strong>i</strong>
            <span>You can update these details anytime from your Profile page.</span>
          </div>

          <button
            type="button"
            className="onboarding-primary onboarding-primary-full"
            onClick={submitOnboarding}
            disabled={saving}
          >
            {saving ? (
              <span className="onboarding-button-loader">
                <span className="onboarding-spinner" aria-hidden="true"></span>
                Finishing setup...
              </span>
            ) : (
              "Finish Setup ->"
            )}
          </button>

          {submitError && <p className="onboarding-submit-error">{submitError}</p>}
        </div>
      )}

      {step <= 2 && (
        <div className="onboarding-nav">
          <button type="button" className="onboarding-secondary" onClick={handleBack} disabled={step === 1 || saving}>
            Back
          </button>
          <button type="button" className="onboarding-primary" onClick={handleNext}>
            Next
          </button>
        </div>
      )}
    </section>
  );
}
