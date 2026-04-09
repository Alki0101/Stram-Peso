const JobVacancy = require("../models/JobVacancy");
const JobApplication = require("../models/JobApplication");
const Message = require("../models/Message");
const { ensureConversationBetweenUsers } = require("./messageController");

const getUserId = (req) => req.user._id || req.user.id;

exports.getEmployerJobs = async (req, res) => {
  try {
    const employerId = getUserId(req);
    const jobs = await JobVacancy.find({ employer: employerId }).sort({ createdAt: -1 });

    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const applicantCount = await JobApplication.countDocuments({ vacancy: job._id });
        return {
          ...job.toObject(),
          applicantCount,
        };
      })
    );

    return res.json(jobsWithCounts);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch employer jobs" });
  }
};

exports.createJob = async (req, res) => {
  try {
    const employerId = getUserId(req);
    const { title, location, description, salary, requirements, jobType, slots } = req.body;

    if (!title || !location || !description) {
      return res.status(400).json({ message: "title, location, and description are required" });
    }

    const job = await JobVacancy.create({
      title: String(title).trim(),
      location: String(location).trim(),
      description: String(description).trim(),
      salary: salary ? String(salary).trim() : "",
      requirements: requirements ? String(requirements).trim() : "",
      jobType: jobType || "Full-time",
      slots: Number(slots) > 0 ? Number(slots) : 1,
      employer: employerId,
      status: "active",
      isActive: true,
      updatedAt: new Date(),
    });

    return res.status(201).json(job);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create job" });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const employerId = String(getUserId(req));
    const { id } = req.params;

    const job = await JobVacancy.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (String(job.employer) !== employerId) {
      return res.status(403).json({ message: "You can only update your own job" });
    }

    const allowedFields = ["title", "location", "description", "salary", "requirements", "jobType", "slots", "status"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    });

    if (req.body.status === "closed") {
      job.isActive = false;
    }
    if (req.body.status === "active") {
      job.isActive = true;
    }

    job.updatedAt = new Date();

    await job.save();
    return res.json(job);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update job" });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const employerId = String(getUserId(req));
    const { id } = req.params;

    const job = await JobVacancy.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (String(job.employer) !== employerId) {
      return res.status(403).json({ message: "You can only close your own job" });
    }

    job.status = "closed";
    job.isActive = false;
    job.updatedAt = new Date();
    await job.save();

    return res.json({ message: "Job closed successfully", job });
  } catch (error) {
    return res.status(500).json({ message: "Failed to close job" });
  }
};

exports.getApplicantsForJob = async (req, res) => {
  try {
    const employerId = String(getUserId(req));
    const { jobId } = req.params;

    const job = await JobVacancy.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (String(job.employer) !== employerId) {
      return res.status(403).json({ message: "You can only view applicants for your own jobs" });
    }

    const applications = await JobApplication.find({ vacancy: jobId })
      .populate("applicant", "name email phone address skills resume resumeFile validIdFile")
      .sort({ createdAt: -1 });

    return res.json(applications);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch applicants" });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const employerId = String(getUserId(req));
    const { applicationId } = req.params;
    const { status, employerNote } = req.body;

    const allowed = ["pending", "reviewed", "shortlisted", "rejected", "hired"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const application = await JobApplication.findById(applicationId)
      .populate("vacancy", "title employer")
      .populate("applicant", "name");
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (!application.vacancy || String(application.vacancy.employer) !== employerId) {
      return res.status(403).json({ message: "You can only update applications for your own jobs" });
    }

    application.status = status;
    if (typeof employerNote === "string") {
      application.employerNote = employerNote;
    }
    application.statusUpdatedAt = new Date();

    await application.save();

    if (["reviewed", "shortlisted", "hired"].includes(status)) {
      const conversation = await ensureConversationBetweenUsers(employerId, application.applicant);

      const hasExistingMessage = await Message.exists({ conversationId: conversation._id });
      if (!hasExistingMessage) {
        const applicantName = application.applicant?.name || "there";
        const jobTitle = application.vacancy?.title || "this role";
        const autoContent = `Hi ${applicantName}, we've reviewed your application for ${jobTitle}. We'd like to get in touch with you.`;

        const autoMessage = await Message.create({
          conversationId: conversation._id,
          sender: employerId,
          content: autoContent,
          isRead: false,
        });

        conversation.lastMessage = autoMessage.content;
        conversation.lastMessageAt = autoMessage.createdAt;
        await conversation.save();

        const io = req.app.get("io");
        if (io) {
          io.to(String(conversation._id)).emit("receive_message", {
            _id: autoMessage._id,
            conversationId: conversation._id,
            sender: employerId,
            content: autoMessage.content,
            createdAt: autoMessage.createdAt,
            isRead: false,
          });
        }
      }
    }

    const updatedApplication = await JobApplication.findById(applicationId)
      .populate("applicant", "name email phone address skills resume resumeFile validIdFile")
      .populate("vacancy", "title location");

    return res.json(updatedApplication);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update application status" });
  }
};

exports.getEmployerStats = async (req, res) => {
  try {
    const employerId = getUserId(req);

    const jobs = await JobVacancy.find({ employer: employerId }).select("_id status");
    const jobIds = jobs.map((job) => job._id);

    const [totalApplicants, pendingReview, shortlisted, hired] = await Promise.all([
      JobApplication.countDocuments({ vacancy: { $in: jobIds } }),
      JobApplication.countDocuments({
        vacancy: { $in: jobIds },
        status: { $in: ["pending", "Applied"] },
      }),
      JobApplication.countDocuments({
        vacancy: { $in: jobIds },
        status: "shortlisted",
      }),
      JobApplication.countDocuments({
        vacancy: { $in: jobIds },
        status: { $in: ["hired", "Accepted"] },
      }),
    ]);

    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((job) => job.status !== "closed").length;

    return res.json({
      totalJobs,
      activeJobs,
      totalApplicants,
      pendingReview,
      shortlisted,
      hired,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch employer stats" });
  }
};

exports.getEmployerProfileStats = async (req, res) => {
  try {
    const employerId = getUserId(req);

    const jobs = await JobVacancy.find({ employer: employerId }).select("_id status");
    const jobIds = jobs.map((job) => job._id);

    const totalApplicants = await JobApplication.countDocuments({ vacancy: { $in: jobIds } });
    const activeJobs = jobs.filter((job) => job.status !== "closed").length;
    const closedJobs = jobs.filter((job) => job.status === "closed").length;

    return res.json({
      activeJobs,
      totalApplicants,
      closedJobs,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch employer profile stats" });
  }
};
