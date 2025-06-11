let currentProgress = { status: "Idle", prompt: "" };
let lastSentProgress = null;

function setCurrentProgress(status, prompt = "") {
  if (typeof status === "object" && status !== null) {
    currentProgress = { ...status };
  } else {
    currentProgress = { status, prompt };
  }
  console.log("Progress updated:", currentProgress);
}

function getCurrentProgress() {
  console.log("Progress fetched:", currentProgress);
  return currentProgress;
}

function getProgressIfChanged() {
  if (
    lastSentProgress &&
    lastSentProgress.status === currentProgress.status &&
    lastSentProgress.prompt === currentProgress.prompt
  ) {
    return null;
  }
  lastSentProgress = { ...currentProgress };
  return currentProgress;
}

module.exports = {
  setCurrentProgress,
  getCurrentProgress,
  getProgressIfChanged,
};
