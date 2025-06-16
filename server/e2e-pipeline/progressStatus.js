// server/progressStatus.js
const EventEmitter = require("events");

class ProgressEmitter extends EventEmitter {}
const progressEmitter = new ProgressEmitter();

let currentStatus = {
  status: "Idle",
  prompt: "",
};

function setCurrentProgress(status, prompt = "") {
  currentStatus = { status, prompt };
  progressEmitter.emit("progress", currentStatus);
}

function updateProgress({ status, prompt }) {
  if (status || prompt !== undefined) {
    setCurrentProgress(
      status ?? currentStatus.status,
      prompt ?? currentStatus.prompt
    );
  }
}

function getCurrentProgress() {
  return currentStatus;
}

function resetProgress() {
  currentStatus = { status: "Idle", prompt: "" };
  progressEmitter.emit("progress", currentStatus);
}

module.exports = {
  setCurrentProgress,
  updateProgress,
  getCurrentProgress,
  resetProgress,
  progressEmitter,
};
