const JobApplication = require("../models/JobApplication");

const toPlainObject = (value) => {
  if (!value) return value;
  if (typeof value.toObject === "function") {
    return value.toObject();
  }
  return value;
};

const getApplicationCountMap = async (jobIds = []) => {
  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    return {};
  }

  const aggregateRows = await JobApplication.aggregate([
    { $match: { vacancy: { $in: jobIds } } },
    { $group: { _id: "$vacancy", total: { $sum: 1 } } },
  ]);

  return aggregateRows.reduce((accumulator, row) => {
    accumulator[String(row._id)] = Number(row.total || 0);
    return accumulator;
  }, {});
};

const attachApplicationCounts = (jobs, countMap = {}) =>
  jobs.map((job) => {
    const plainJob = toPlainObject(job);
    return {
      ...plainJob,
      applicationCount: Number(countMap[String(plainJob._id)] || 0),
    };
  });

const sortByFeaturedThenRecent = (jobs = [], limit = 4) => {
  const featuredJobs = jobs
    .filter((job) => job.isFeatured)
    .sort((left, right) => {
      const leftOrder = Number.isFinite(Number(left.featuredOrder)) ? Number(left.featuredOrder) : Number.MAX_SAFE_INTEGER;
      const rightOrder = Number.isFinite(Number(right.featuredOrder)) ? Number(right.featuredOrder) : Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    });

  const featuredIds = new Set(featuredJobs.map((job) => String(job._id)));
  const recentJobs = jobs
    .filter((job) => !featuredIds.has(String(job._id)))
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

  return [...featuredJobs, ...recentJobs].slice(0, limit);
};

const normalizeFeaturedOrdering = async (jobs = []) => {
  const featuredJobs = jobs
    .filter((job) => job.isFeatured)
    .sort((left, right) => {
      const leftOrder = Number.isFinite(Number(left.featuredOrder)) ? Number(left.featuredOrder) : Number.MAX_SAFE_INTEGER;
      const rightOrder = Number.isFinite(Number(right.featuredOrder)) ? Number(right.featuredOrder) : Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    });

  await Promise.all(
    featuredJobs.map((job, index) => {
      job.isFeatured = true;
      job.featuredOrder = index + 1;
      return job.save();
    })
  );
};

const getHomepageJobsPayload = async (jobs, limit = 4) => {
  const jobIds = jobs.map((job) => job._id);
  const countMap = await getApplicationCountMap(jobIds);
  const orderedJobs = sortByFeaturedThenRecent(jobs, limit);

  return attachApplicationCounts(orderedJobs, countMap);
};

module.exports = {
  attachApplicationCounts,
  getApplicationCountMap,
  getHomepageJobsPayload,
  normalizeFeaturedOrdering,
  sortByFeaturedThenRecent,
};