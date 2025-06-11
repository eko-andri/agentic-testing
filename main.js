document
  .getElementById("e2e-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const extras = Array.from(
      document.querySelectorAll('input[name="extras"]:checked')
    ).map((input) => input.value);
    const formData = {
      ticketNumber: document.getElementById("ticket-number").value,
      ticketType: document.getElementById("ticket-type").value,
      description: document.getElementById("description").value,
      howToReproduce: document.getElementById("how-to-reproduce").value,
      acceptanceCriteria: document.getElementById("acceptance-criteria").value,
      extras: extras,
    };
    window.lastFormData = formData;
    // Reset lastPrompts agar agent berikutnya bisa update prompt baru
    window.lastPrompts = {
      promptEngineer:
        formData.description +
        (formData.acceptanceCriteria ? "\n" + formData.acceptanceCriteria : ""),
      criticAgent: "",
      testGenerator: "",
    };
    const responseContainer = document.getElementById("response-container");
    const responsePlaceholder = document.getElementById("response-placeholder");
    responsePlaceholder.textContent = "Processing...";
    responseContainer.style.display = "block";
    try {
      const response = await fetch("http://localhost:3333/api/run-e2e", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      // Simpan prompt terakhir untuk setiap agent
      if (result.success) {
        if (result.testPlan) {
          window.lastPrompts.promptEngineer =
            formData.description +
            (formData.acceptanceCriteria
              ? "\n" + formData.acceptanceCriteria
              : "");
        }
        if (result.testPlanFeedback) {
          window.lastPrompts.criticAgent = result.testPlan;
        }
        if (result.playwrightCode) {
          window.lastPrompts.testGenerator = result.testPlan;
        }
      }
      // Simpan prompt terakhir untuk setiap agent
      let lastPrompts = {
        promptEngineer: "",
        criticAgent: "",
        testGenerator: "",
      };
      if (result.success) {
        let html = "";
        if (result.testPlan) {
          lastPrompts.promptEngineer =
            formData.description +
            (formData.acceptanceCriteria
              ? "\n" + formData.acceptanceCriteria
              : "");
          html += `<div style='font-weight:600;margin-bottom:0.5em;'>Agent of Prompt Engineer Agent Output:</div>`;
          html += result.testPlan
            .split("\n")
            .map((line) => `<p>${line}</p>`)
            .join("");
        }
        if (result.testPlanFeedback) {
          lastPrompts.criticAgent = result.testPlan;
          html += `<div style='font-weight:600;margin:1em 0 0.5em 0;'>Agent of Critic Output:</div>`;
          html += `<p>${result.testPlanFeedback}</p>`;
        }
        if (result.playwrightCode) {
          lastPrompts.testGenerator = result.testPlan;
          html += `<div style='font-weight:600;margin:1em 0 0.5em 0;'>Agent of Test Generator Output:</div>`;
          html += `<pre style="background:#222;color:#fff;padding:1em;border-radius:8px;overflow-x:auto;"><code>${result.playwrightCode.replace(
            /</g,
            "&lt;"
          )}</code></pre>`;
        }
        responsePlaceholder.innerHTML = html;
        responseContainer.style.background = "#eafaf1";
        responseContainer.style.color = "#27ae60";
      } else {
        responsePlaceholder.textContent = `Error: ${result.error}`;
        responseContainer.style.background = "#fdecea";
        responseContainer.style.color = "#c0392b";
      }
    } catch (error) {
      responsePlaceholder.textContent = `Request failed: ${error.message}`;
      responseContainer.style.background = "#fdecea";
      responseContainer.style.color = "#c0392b";
    }
  });

// Simpan prompt terakhir untuk setiap agent secara global
window.lastPrompts = window.lastPrompts || {
  promptEngineer: "",
  criticAgent: "",
  testGenerator: "",
};
window.lastFormData = window.lastFormData || {};

// 1. Jangan reset form setelah submit sukses/gagal
// Pastikan tidak ada kode seperti form.reset() atau pengosongan value input setelah submit
// Jika ada, hapus kode tersebut

document.addEventListener("DOMContentLoaded", function () {
  const responseContainer = document.getElementById("response-container");
  const responsePlaceholder = document.getElementById("response-placeholder");
  const submitBtn = document.querySelector("button[type='submit']");
  const generateRunTestBtn = document.getElementById("generate-run-test-btn");
  const spinnerOverlay = document.getElementById("spinner-overlay");
  const spinnerLabel = document.getElementById("spinner-label");
  let lastStatus = "";
  let isProcessing = false;

  function setButtonsDisabled(disabled) {
    if (submitBtn) submitBtn.disabled = disabled;
    if (generateRunTestBtn) generateRunTestBtn.disabled = disabled;
    if (disabled) {
      if (submitBtn) submitBtn.classList.add("btn-disabled");
      if (generateRunTestBtn) generateRunTestBtn.classList.add("btn-disabled");
    } else {
      if (submitBtn) submitBtn.classList.remove("btn-disabled");
      if (generateRunTestBtn)
        generateRunTestBtn.classList.remove("btn-disabled");
    }
  }

  function setSpinnerVisible(visible, labelText = "Processing...") {
    if (!spinnerOverlay) return;
    if (visible) {
      spinnerOverlay.classList.remove("hidden");
      if (spinnerLabel) spinnerLabel.textContent = labelText;
    } else {
      spinnerOverlay.classList.add("hidden");
    }
  }

  // Hanya satu EventSource aktif di sini
  const evtSource = new EventSource("http://localhost:3333/api/progress");
  evtSource.onmessage = function (event) {
    const data = JSON.parse(event.data);
    lastStatus = data.status;
    // Tombol disable hanya jika status proses, enable jika status mengandung 'generated', 'finished', 'done', 'error', atau 'idle'
    const lowerStatus = (data.status || "").toLowerCase();
    const processing =
      (lowerStatus.includes("generating") ||
        lowerStatus.includes("running") ||
        lowerStatus.includes("processing") ||
        lowerStatus.includes("evaluating")) &&
      // pastikan status tidak mengandung kata selesai atau generated
      !(
        lowerStatus.includes("generated") ||
        lowerStatus.includes("finished") ||
        lowerStatus.includes("done") ||
        lowerStatus.includes("error") ||
        lowerStatus.includes("idle")
      );
    setButtonsDisabled(processing);
    setSpinnerVisible(processing, data.status || "Processing...");
    if (responsePlaceholder) {
      let promptText = data.prompt || "";
      let statusAgent = data.status;
      let statusProcess = "";
      if (data.status && data.status.includes("\n")) {
        const split = data.status.split("\n");
        statusAgent = split[0];
        statusProcess = split.slice(1).join(" ").trim();
      }
      if (data.playwrightCode) {
        window.lastPlaywrightCode = data.playwrightCode;
        responsePlaceholder.innerHTML =
          `<div style='font-weight:600;'>${statusAgent}</div>` +
          (statusProcess
            ? `<div style='font-weight:400;margin-bottom:0.5em;'>${statusProcess}</div>`
            : "") +
          `<div style='margin-top:0.3em;'><span style='font-size:0.98em;color:#555;'>Playwright Code:</span><br><pre style='background:#222;color:#fff;padding:1em;border-radius:8px;overflow-x:auto;font-size:0.92em;font-family:inherit;'>${data.playwrightCode.replace(
            /</g,
            "&lt;"
          )}</pre></div>`;
      } else {
        responsePlaceholder.innerHTML =
          `<div style='font-weight:600;'>${statusAgent}</div>` +
          (statusProcess
            ? `<div style='font-weight:400;margin-bottom:0.5em;'>${statusProcess}</div>`
            : "") +
          (promptText
            ? `<div style='margin-top:0.3em;'><span style='font-size:0.98em;color:#555;'>Prompt:</span><br><pre style='background:#f4f4f4;padding:0.7em;border-radius:6px;white-space:pre-wrap;font-size:0.92em;font-family:inherit;'>${promptText.replace(
                /</g,
                "&lt;"
              )}</pre></div>`
            : "");
      }
    }
  };
  evtSource.onerror = function () {
    setButtonsDisabled(false);
    setSpinnerVisible(false);
    if (responsePlaceholder) {
      responsePlaceholder.textContent = "Progress connection lost or error.";
    }
  };
});

// Handler untuk tombol fetch Bedrock Models
const fetchModelsBtn = document.getElementById("fetch-models-btn");
const modelsListField = document.getElementById("bedrock-models-list");
const modelsErrorDiv = document.getElementById("bedrock-models-error");

if (fetchModelsBtn) {
  fetchModelsBtn.addEventListener("click", async () => {
    modelsListField.value = "";
    modelsErrorDiv.textContent = "";
    fetchModelsBtn.disabled = true;
    fetchModelsBtn.textContent = "Loading...";
    try {
      const res = await fetch("http://localhost:3333/api/bedrock-models");
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        let errMsg = "Unknown error";
        if (contentType && contentType.includes("application/json")) {
          const err = await res.json();
          errMsg = err.error || errMsg;
        } else {
          errMsg = await res.text();
        }
        throw new Error(errMsg);
      }
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (Array.isArray(data)) {
          modelsListField.value = data
            .map((m) => `${m.modelId} - ${m.modelName || ""}`)
            .join("\n");
        } else {
          modelsListField.value = JSON.stringify(data, null, 2);
        }
      } else {
        throw new Error(
          "API did not return JSON. Response: " + (await res.text())
        );
      }
    } catch (err) {
      modelsErrorDiv.textContent = "Error: " + (err.message || err);
    } finally {
      fetchModelsBtn.disabled = false;
      fetchModelsBtn.textContent = "Show Bedrock Models";
    }
  });
}

// Handler tombol Generate and Run Test
const generateRunTestBtn = document.getElementById("generate-run-test-btn");
if (generateRunTestBtn) {
  generateRunTestBtn.addEventListener("click", async () => {
    const responseContainer = document.getElementById("response-container");
    const responsePlaceholder = document.getElementById("response-placeholder");
    responsePlaceholder.textContent = "Generating and running test...";
    responseContainer.style.display = "block";
    // Ambil kode Playwright terakhir yang sudah di-preview di UI
    let playwrightCode = "";
    // Coba ambil dari data terakhir yang sudah diterima dari SSE
    if (
      window.lastPlaywrightCode &&
      typeof window.lastPlaywrightCode === "string" &&
      window.lastPlaywrightCode.trim() !== ""
    ) {
      playwrightCode = window.lastPlaywrightCode;
    } else if (window.lastPrompts && window.lastPrompts.testGenerator) {
      playwrightCode = window.lastPrompts.testGenerator;
    }
    if (!playwrightCode || playwrightCode.trim() === "") {
      responsePlaceholder.textContent =
        "No Playwright code available. Please generate test first.";
      responseContainer.style.background = "#fdecea";
      responseContainer.style.color = "#c0392b";
      return;
    }
    try {
      const res = await fetch(
        "http://localhost:3333/api/generate-and-run-test",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playwrightCode }),
        }
      );
      const result = await res.json();
      if (result.success) {
        responsePlaceholder.innerHTML =
          `<div style='font-weight:600;color:#27ae60;'>Test file generated and executed successfully.</div>` +
          (result.output
            ? `<pre style='background:#222;color:#fff;padding:1em;border-radius:8px;overflow-x:auto;font-size:0.92em;font-family:inherit;'>${result.output.replace(
                /</g,
                "&lt;"
              )}</pre>`
            : "");
        responseContainer.style.background = "#eafaf1";
        responseContainer.style.color = "#27ae60";
      } else {
        responsePlaceholder.innerHTML =
          `<div style='font-weight:600;color:#c0392b;'>Failed to generate or run test.</div>` +
          (result.error
            ? `<pre style='background:#fdecea;color:#c0392b;padding:1em;border-radius:8px;overflow-x:auto;font-size:0.92em;font-family:inherit;'>${result.error.replace(
                /</g,
                "&lt;"
              )}</pre>`
            : "");
        responseContainer.style.background = "#fdecea";
        responseContainer.style.color = "#c0392b";
      }
    } catch (err) {
      responsePlaceholder.textContent = `Request failed: ${err.message}`;
      responseContainer.style.background = "#fdecea";
      responseContainer.style.color = "#c0392b";
    }
  });
}

/* Tambahkan style opsional untuk .btn-disabled di style.css:
.btn-disabled { opacity: 0.6; pointer-events: none; }
*/
