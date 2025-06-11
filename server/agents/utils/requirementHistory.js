const fs = require("fs");
const path = require("path");

function getRequirementFileName(type = "dob") {
  return path.join(__dirname, "../tests", `${type}.json`);
}

function loadRequirementHistory(type = "dob") {
  const file = getRequirementFileName(type);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveRequirementHistory(type, history) {
  const file = getRequirementFileName(type);
  fs.writeFileSync(file, JSON.stringify(history, null, 2), "utf8");
}

function isSameRequirement(a, b) {
  return (
    a.description === b.description &&
    a.acceptanceCriteria === b.acceptanceCriteria
  );
}

module.exports = {
  getRequirementFileName,
  loadRequirementHistory,
  saveRequirementHistory,
  isSameRequirement,
};
