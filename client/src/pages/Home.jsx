import { useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { jobAPI } from "../services/api";
import "../styles/home.css";
import heroVideo from "../assets/videos/hero-video.mp4";
import pesoLogo from "../assets/images/peso-logo.png";

const HOME_PROGRAMS = [
  {
    id: "spes",
    tag: "DOLE",
    title: "SPES",
    description:
      "The Special Program for Employment of Students gives eligible youth short-term work opportunities while helping families and communities.",
    action: "Learn More",
    icon: "🎓",
    availability: "Open for applications",
  },
  {
    id: "tupad",
    tag: "DOLE",
    title: "TUPAD",
    description:
      "TUPAD provides emergency employment support for displaced workers and seasonal laborers through community-based projects.",
    action: "View Details",
    icon: "🛠️",
    availability: "Limited slots available",
  },
  {
    id: "trainings",
    tag: "TESDA",
    title: "Training Programs",
    description:
      "Explore TESDA-accredited training options that help job seekers build practical skills and strengthen employability.",
    action: "See Trainings",
    icon: "📘",
    availability: "Open for applications",
  },
];

const HOME_FEATURED_JOBS = [
  {
    id: "community-liaison-assistant",
    title: "Community Liaison Assistant",
    employer: "Marinduque Community Development Group",
    location: "Boac, Marinduque",
    type: "Full-time",
    description:
      "Support field coordination, community outreach, and documentation for local livelihood programs.",
  },
  {
    id: "admin-support-staff",
    title: "Administrative Support Staff",
    employer: "Island Cooperative Services",
    location: "Gasan, Marinduque",
    type: "Contract",
    description:
      "Handle office coordination, records management, and front-line support for daily operations.",
  },
  {
    id: "field-encoder",
    title: "Field Encoder",
    employer: "Provincial Field Assistance Office",
    location: "Santa Cruz, Marinduque",
    type: "Project-Based",
    description:
      "Encode beneficiary records, update reports, and assist in local employment program monitoring.",
  },
  {
    id: "service-associate",
    title: "Customer Service Associate",
    employer: "Marinduque Trade Center",
    location: "Torrijos, Marinduque",
    type: "Full-time",
    description:
      "Support customer inquiries, assist transactions, and maintain service quality in a retail setting.",
  },
];

export default function Home() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const programsRef = useRef(null);
  const jobsRef = useRef(null);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [featuredJobs, setFeaturedJobs] = useState(HOME_FEATURED_JOBS);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [visibleCards, setVisibleCards] = useState({});

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    const target = hash === "programs" ? programsRef.current : hash === "available-jobs" ? jobsRef.current : null;

    if (target) {
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    if (location.pathname === "/" && !location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.hash, location.pathname]);

  useEffect(() => {
    let active = true;

    const loadJobs = async () => {
      setJobsLoading(true);

      try {
        const { data } = await jobAPI.getHomepageJobs();
        if (!active) return;

        setFeaturedJobs(Array.isArray(data) && data.length > 0 ? data : HOME_FEATURED_JOBS);
      } catch (error) {
        if (active) {
          setFeaturedJobs(HOME_FEATURED_JOBS);
        }
      } finally {
        if (active) {
          setJobsLoading(false);
        }
      }
    };

    loadJobs();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll("[data-fade-card]"));

    if (!cards.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const cardId = entry.target.getAttribute("data-card-id");

          if (cardId) {
            setVisibleCards((current) => ({ ...current, [cardId]: true }));
          }

          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [featuredJobs]);

  const openRegisterPrompt = () => {
    setShowRegisterPrompt(true);
  };

  const closeRegisterPrompt = () => {
    setShowRegisterPrompt(false);
  };

  const goToRegister = (route) => {
    closeRegisterPrompt();
    navigate(route);
  };

  const handleProgramAction = (program) => {
    setSelectedProgram(program);
  };

  const closeProgramModal = () => {
    setSelectedProgram(null);
  };

  const handleViewJob = (job) => {
    if (!job?._id) return;
    navigate(`/jobs/${job._id}`);
  };

  const getProgramBadgeLabel = (program) => program?.tag || "Program";

  const getJobStatus = (job) => {
    const deadlineValue = job?.applicationDeadline || job?.deadline;

    if (!deadlineValue) {
      return { label: "Open", variant: "open" };
    }

    const deadlineDate = new Date(deadlineValue);

    if (Number.isNaN(deadlineDate.getTime())) {
      return { label: "Open", variant: "open" };
    }

    const daysRemaining = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 7) {
      return {
        label: `Closing soon${daysRemaining > 0 ? ` · ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left` : ""}`,
        variant: "closing",
      };
    }

    return { label: "Open", variant: "open" };
  };

  const getPostedLabel = (createdAt) => {
    if (!createdAt) return "Recently posted";

    const postedAt = new Date(createdAt);

    if (Number.isNaN(postedAt.getTime())) return "Recently posted";

    const daysAgo = Math.max(0, Math.floor((Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24)));

    if (daysAgo === 0) return "Posted today";
    if (daysAgo === 1) return "Posted 1 day ago";

    return `Posted ${daysAgo} days ago`;
  };

  const getEmployerName = (job) => {
    if (typeof job?.employer === "string") return job.employer;
    return job?.employer?.companyName || job?.employer?.name || "Employer";
  };

  const getJobDescription = (job) => job?.description || "Open opportunity for Marinduque job seekers.";

  return (
    <div className="home-container">
      <section className="video-hero-section">
        <video className="hero-video" autoPlay loop muted playsInline>
          <source src={heroVideo} type="video/mp4" />
          Your browser does not support HTML5 video.
        </video>

        <div className="video-overlay"></div>

        <div className="video-hero-content">
          <div className="hero-logo-container">
            <img src={pesoLogo} alt="PESO Marinduque Logo" className="hero-logo" />
          </div>

          <h1 className="hero-main-title">TRABAHO MANDIN!</h1>

          <p className="hero-tagline">Trabaho para sa Marinduqueño</p>

          <div className="hero-description">
            <p>
              Marinduque, proudly known as the Heart of the Philippines, is a province rich in culture, resilience,
              and community spirit. Through Online Employment in Marinduque, we connect local talent with
              opportunities, empowering every Marinduqueño to build a stronger future at home and beyond
            </p>
          </div>

          {!user && (
            <div className="hero-mobile-quick-actions">
              <button
                type="button"
                className="hero-mobile-btn hero-mobile-login-btn"
                onClick={() => navigate("/login")}
              >
                Login
              </button>
              <button
                type="button"
                className="hero-mobile-btn hero-mobile-register-btn"
                onClick={openRegisterPrompt}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="programs-section" id="programs" ref={programsRef}>
        <div className="programs-section-inner">
          <div className="section-heading-wrap">
            <span className="section-kicker">Programs</span>
            <h2>Programs offered by DOLE and TESDA</h2>
            <p>
              Discover livelihood support, emergency employment, and skills training opportunities designed for
              Marinduqueños.
            </p>
          </div>

          <div className="programs-grid">
            {HOME_PROGRAMS.map((program, index) => (
              <article
                key={program.id}
                className={`program-card ${visibleCards[program.id] ? "is-visible" : ""}`}
                data-fade-card="true"
                data-card-id={program.id}
                style={{ "--card-delay": `${index * 90}ms` }}
              >
                <div className="program-card-header">
                  <div className="program-card-icon" aria-hidden="true">
                    {program.icon}
                  </div>
                  <span className="program-card-availability">{program.availability}</span>
                </div>
                <span className="program-card-tag">{getProgramBadgeLabel(program)}</span>
                <h3>{program.title}</h3>
                <p>{program.description}</p>
                <button type="button" className="program-card-btn" onClick={() => handleProgramAction(program)}>
                  {program.action}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="available-jobs-section" id="available-jobs" ref={jobsRef}>
        <div className="section-heading-wrap">
          <span className="section-kicker">Available Jobs</span>
          <h2>Current employer openings</h2>
          <p>
            Browse featured vacancies from local employers. Visitors can preview openings here and log in to apply.
          </p>
        </div>

        {jobsLoading ? (
          <p className="section-loading">Loading available jobs...</p>
        ) : (
          <div className="jobs-grid">
            {featuredJobs.map((job, index) => {
              const title = job.title || "Untitled Position";
              const jobId = job._id || job.id || title;
              const employerName = getEmployerName(job);
              const description = getJobDescription(job);
              const jobType = job.jobType || job.type || "Full-time";
              const salary = job.salary || "Salary negotiable";
              const status = getJobStatus(job);
              const postedLabel = getPostedLabel(job.createdAt);

              return (
                <article
                  key={jobId}
                  className={`job-preview-card job-preview-card--clickable ${status.variant === "closing" ? "job-preview-card--closing" : "job-preview-card--open"} ${visibleCards[jobId] ? "is-visible" : ""}`}
                  data-fade-card="true"
                  data-card-id={jobId}
                  style={{ "--card-delay": `${index * 90}ms` }}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleViewJob(job)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleViewJob(job);
                    }
                  }}
                >
                  <div className="job-preview-header">
                    <div className="job-preview-header-copy">
                      <p className="job-preview-employer">{employerName}</p>
                      <h3>{title}</h3>
                    </div>
                    <span className="job-preview-status">
                      <span className="job-preview-status-dot" aria-hidden="true"></span>
                      {status.label}
                    </span>
                  </div>
                  <p className="job-preview-meta">{jobType} · {job.location || "Marinduque"} · {salary}</p>
                  <p className="job-preview-posted">{postedLabel}</p>
                  <p className="job-preview-description">{description}</p>
                  <div className="job-preview-actions">
                    <button
                      type="button"
                      className="job-preview-btn job-preview-btn-primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleViewJob(job);
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showRegisterPrompt && (
        <div className="register-choice-overlay" onClick={closeRegisterPrompt}>
          <div className="register-choice-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Register as</h3>
            <p>Select your account type to continue.</p>
            <div className="register-choice-actions">
              <button type="button" className="register-choice-btn" onClick={() => goToRegister("/register")}>
                Resident / Jobseeker
              </button>
              <button
                type="button"
                className="register-choice-btn"
                onClick={() => goToRegister("/register-employer")}
              >
                Employer
              </button>
            </div>
            <button type="button" className="register-choice-cancel" onClick={closeRegisterPrompt}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedProgram && (
        <div className="register-choice-overlay" onClick={closeProgramModal}>
          <div className="register-choice-modal program-detail-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{selectedProgram.title}</h3>
            <p className="program-detail-tag">{selectedProgram.tag}</p>
            <p>{selectedProgram.description}</p>
            <button type="button" className="register-choice-cancel" onClick={closeProgramModal}>
              Close
            </button>
          </div>
        </div>
      )}

      <section className="features-section">
        <h2>Find Work or Hire Talent</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="icon">👨‍💼</span>
            <h3>Job Seekers</h3>
            <p>Discover local job openings and apply online.</p>
          </div>
          <div className="feature-card">
            <span className="icon">🏢</span>
            <h3>Employers</h3>
            <p>Post vacancies and manage applicants in one place.</p>
          </div>
          <div className="feature-card">
            <span className="icon">📄</span>
            <h3>Resume Upload</h3>
            <p>Attach your resume when applying for jobs.</p>
          </div>
          <div className="feature-card">
            <span className="icon">📊</span>
            <h3>Admin Analytics</h3>
            <p>Track users, vacancies, and application activity.</p>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Register</h3>
            <p>Create an account as a job seeker or employer.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Login</h3>
            <p>Sign in with your credentials.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Apply</h3>
            <p>Upload your resume and submit applications.</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Manage</h3>
            <p>Employers review applicants and admins monitor analytics.</p>
          </div>
        </div>
      </section>

      <div className="bottom-green-section">
        <div className="bottom-beige-bar"></div>

        <div className="bottom-green-content">
          <div className="bottom-yellow-accent"></div>
          <div className="bottom-bg-overlay"></div>

          <div className="bottom-inner-container">
            <div className="bottom-yellow-box">
              <img src={pesoLogo} alt="PESO Marinduque Logo" className="bottom-logo" />
            </div>

            <div className="bottom-text-content">
              <h1 className="bottom-main-title">STRAM PESO</h1>
              <p className="bottom-subtitle">Lalawigan ng Marinduque</p>
            </div>
          </div>

          <div className="bottom-footer">
            <p>© 2025 Provincial Government of Marinduque. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}