// progressStatus.js - Fixed version
let currentProgress = { status: "Idle", prompt: "" };
let lastSentProgress = null;

function updateProgress(progressData) {
  if (typeof progressData === "object" && progressData !== null) {
    currentProgress = {
      ...currentProgress,
      ...progressData,
      timestamp: new Date().toISOString(),
    };
  } else {
    currentProgress = {
      status: progressData,
      prompt: "",
      timestamp: new Date().toISOString(),
    };
  }
  console.log("Progress updated:", currentProgress);
}

function resetProgress() {
  currentProgress = {
    status: "Idle",
    prompt: "",
    timestamp: new Date().toISOString(),
  };
  lastSentProgress = null;
  console.log("Progress reset to idle");
}

function getCurrentProgress() {
  return currentProgress;
}

// Fungsi baru untuk memeriksa apakah progress berubah
function getProgressIfChanged() {
  // Jika tidak ada progress sebelumnya, kirim yang sekarang
  if (!lastSentProgress) {
    lastSentProgress = { ...currentProgress };
    return currentProgress;
  }

  // Periksa apakah ada perubahan signifikan
  const hasChanged =
    lastSentProgress.status !== currentProgress.status ||
    lastSentProgress.prompt !== currentProgress.prompt ||
    lastSentProgress.playwrightCode !== currentProgress.playwrightCode;

  if (hasChanged) {
    lastSentProgress = { ...currentProgress };
    return currentProgress;
  }

  // Tidak ada perubahan, return null
  return null;
}

// Fungsi untuk memaksa kirim progress (untuk initial connection)
function forceGetProgress() {
  lastSentProgress = { ...currentProgress };
  return currentProgress;
}

module.exports = {
  updateProgress,
  resetProgress,
  getCurrentProgress,
  getProgressIfChanged,
  forceGetProgress,
};
