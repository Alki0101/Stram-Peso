const JobVacancy = require("../models/JobVacancy");
const JobApplication = require("../models/JobApplication");
const User = require("../models/User");
const Message = require("../models/Message");
const { ensureConversationBetweenUsers } = require("./messageController");

exports.createJob = async (req, res) => {
  try {
    const { title, description, location, salary } = req.body;
    if (!title || !description || !location) {
      return res.status(400).json({ message: "Title, description, and location are required" });
    }

    const job = await JobVacancy.create({
      title,
      description,
      location,
      salary,
      employer: req.user.id,
    });

    res.json({ message: "Job posted successfully", job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getJobs = async (req, res) => {
  try {
    const jobs = await JobVacancy.find({ isActive: true })
      .populate("employer", "name email role companyName industry companySize website businessAddress companyDescription verificationStatus phone")
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const job = await JobVacancy.findById(req.params.id).populate("employer", "name email role companyName industry companySize website businessAddress companyDescription verificationStatus phone");
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await JobVacancy.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    if (job.employer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only update your own job postings" });
    }

    const updates = {
      title: req.body.title || job.title,
      description: req.body.description || job.description,
      location: req.body.location || job.location,
      salary: req.body.salary || job.salary,
      isActive: typeof req.body.isActive === "boolean" ? req.body.isActive : job.isActive,
    };

    const updatedJob = await JobVacancy.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ message: "Job updated", job: updatedJob });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await JobVacancy.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    if (job.employer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own job postings" });
    }

    await JobVacancy.findByIdAndDelete(req.params.id);
    res.json({ message: "Job posting removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.applyToJob = async (req, res) => {
  try {
    const job = await JobVacancy.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const existingApplication = await JobApplication.findOne({
      applicant: req.user.id,
      vacancy: job._id,
    });
    if (existingApplication) {
      return res.status(400).json({ message: "You have already applied to this job" });
    }

    const application = await JobApplication.create({
      applicant: req.user.id,
      vacancy: job._id,
      resume: req.file ? `uploads/${req.file.filename}` : undefined,
      coverLetter: req.body.coverLetter || "",
    });

    res.json({ message: "Application submitted successfully", application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getApplicationsForJob = async (req, res) => {
  try {
    const job = await JobVacancy.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    if (job.employer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const applications = await JobApplication.find({ vacancy: job._id })
      .populate("applicant", "name email about")
      .sort({ appliedAt: -1 });

    if (String(job.employer) === String(req.user.id)) {
      for (const application of applications) {
        const conversation = await ensureConversationBetweenUsers(req.user.id, application.applicant?._id);
        const hasExistingMessage = await Message.exists({ conversationId: conversation._id });

        if (!hasExistingMessage) {
          const applicantName = application.applicant?.name || "there";
          const autoContent = `Hi ${applicantName}, we've reviewed your application for ${job.title}. We'd like to get in touch with you.`;

          const autoMessage = await Message.create({
            conversationId: conversation._id,
            sender: req.user.id,
            content: autoContent,
            isRead: false,
          });

          conversation.lastMessage = autoMessage.content;
          conversation.lastMessageAt = autoMessage.createdAt;
          await conversation.save();
        }
      }
    }

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyApplications = async (req, res) => {
  try {
    const applications = await JobApplication.find({ applicant: req.user.id })
      .populate({
        path: "vacancy",
        select: "title location employer",
        populate: {
          path: "employer",
          select: "name email companyName",
        },
      })
      .sort({ appliedAt: -1 });

    const normalized = await Promise.all(
      applications.map(async (application) => {
        const data = application.toObject();
        const vacancy = data?.vacancy;

        if (!vacancy) {
          return data;
        }

        const employerValue = vacancy.employer;
        const alreadyPopulated = employerValue && typeof employerValue === "object" && employerValue.name;

        if (alreadyPopulated) {
          return data;
        }

        const employerId =
          typeof employerValue === "string"
            ? employerValue
            : employerValue?._id
              ? String(employerValue._id)
              : null;

        if (!employerId) {
          vacancy.employer = { name: "Unknown", companyName: "No company name" };
          return data;
        }

        const employerProfile = await User.findById(employerId).select("name email companyName").lean();
        vacancy.employer = employerProfile || { name: "Unknown", companyName: "No company name" };

        return data;
      })
    );

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMyApplication = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.applicant.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only update your own applications" });
    }

    if (typeof req.body.coverLetter === "string") {
      application.coverLetter = req.body.coverLetter;
    }

    if (req.file) {
      application.resume = `uploads/${req.file.filename}`;
    }

    await application.save();

    const populated = await JobApplication.findById(application._id)
      .populate({
        path: "vacancy",
        select: "title location employer",
        populate: {
          path: "employer",
          select: "name email companyName",
        },
      });

    const normalizedApplication = populated?.toObject ? populated.toObject() : populated;
    if (normalizedApplication?.vacancy) {
      const employerValue = normalizedApplication.vacancy.employer;
      const alreadyPopulated = employerValue && typeof employerValue === "object" && employerValue.name;

      if (!alreadyPopulated) {
        const employerId =
          typeof employerValue === "string"
            ? employerValue
            : employerValue?._id
              ? String(employerValue._id)
              : null;

        if (employerId) {
          const employerProfile = await User.findById(employerId).select("name email companyName").lean();
          normalizedApplication.vacancy.employer = employerProfile || { name: "Unknown", companyName: "No company name" };
        }
      }
    }

    res.json({ message: "Application updated successfully", application: normalizedApplication });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMyApplication = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.applicant.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own applications" });
    }

    await JobApplication.findByIdAndDelete(application._id);
    res.json({ message: "Application withdrawn successfully", id: application._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmployerJobs = async (req, res) => {
  try {
    const jobs = await JobVacancy.find({ employer: req.user.id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
