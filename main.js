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
      testUrl: document.getElementById("test-url").value,
      analysisMethod: document.querySelector(
        'input[name="analysisMethod"]:checked'
      ).value,
      extras: extras,
    };
    window.lastFormData = formData;

    const responseContainer = document.getElementById("response-container");
    const responsePlaceholder = document.getElementById("response-placeholder");
    responsePlaceholder.textContent = "Processing...";
    responseContainer.style.display = "block";
    console.log("Submitting form data:", formData);

    try {
      const response = await fetch("http://localhost:3333/api/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json();

      // Handle new API response structure
      if (result.success) {
        let html = "";

        // Check if we have result data
        if (result.result) {
          if (result.result.formAnalysis) {
            html += `<div style='font-weight:600;margin-bottom:0.5em;'>Form Analysis:</div>`;
            html += `<pre style='background:#f4f4f4;padding:0.7em;border-radius:6px;white-space:pre-wrap;font-size:0.92em;font-family:inherit;'>${JSON.stringify(
              result.result.formAnalysis,
              null,
              2
            )}</pre>`;
          }

          if (result.result.testCode) {
            html += `<div style='font-weight:600;margin:1em 0 0.5em 0;'>Generated Test Code:</div>`;
            html += `<pre style="background:#222;color:#fff;padding:1em;border-radius:8px;overflow-x:auto;"><code>${result.result.testCode.replace(
              /</g,
              "&lt;"
            )}</code></pre>`;

            // Store the playwright code for the run test button
            window.lastPlaywrightCode = result.result.testCode;
          }
        }

        responsePlaceholder.innerHTML =
          html ||
          `<div style='font-weight:600;color:#27ae60;'>Test generation completed successfully.</div>`;
        responseContainer.style.background = "#eafaf1";
        responseContainer.style.color = "#27ae60";
      } else {
        // Handle error
        responsePlaceholder.innerHTML = `<div style='font-weight:600;color:#c0392b;'>Error:</div><div>${
          result.error || "Unknown error occurred"
        }</div>`;
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
        lowerStatus.includes("evaluating") ||
        lowerStatus.includes("analyzing")) &&
      // pastikan status tidak mengandung kata selesai atau generated atau user input required
      !(
        lowerStatus.includes("generated") ||
        lowerStatus.includes("finished") ||
        lowerStatus.includes("done") ||
        lowerStatus.includes("error") ||
        lowerStatus.includes("idle") ||
        lowerStatus.includes("user input required") ||
        lowerStatus.includes("incomplete")
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
      // Get form data for description
      const description = document.getElementById("description").value || "";
      const testUrl = document.getElementById("test-url").value || "";

      const res = await fetch(
        "http://localhost:3333/api/generate-and-run-test",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playwrightCode,
            description,
            testUrl,
            checkExisting: true,
          }),
        }
      );
      const result = await res.json();
      if (result.success) {
        let html = `<div style='font-weight:600;color:#27ae60;margin-bottom:1em;'>🎭 Test file generated and executed successfully!</div>`;

        // Show file info
        if (result.testFileCreated) {
          html += `<div style='margin-bottom:0.8em;'><strong>📁 Test File:</strong> ${result.testFileCreated.replace(
            /.*\//,
            ""
          )}</div>`;
        }

        // Show existing test info if applicable
        if (result.existingTestInfo && result.existingTestInfo.found) {
          html += `<div style='margin-bottom:0.8em;background:#fff3cd;padding:0.5em;border-radius:4px;border:1px solid #ffeaa7;'>
                     <strong>🔄 Merged with existing test:</strong> ${result.existingTestInfo.filename}
                   </div>`;
        }

        // Show test results
        if (result.testResults && result.testResults.summary) {
          html += `<div style='margin-top:1em;background:#f8f9fa;padding:1em;border-radius:6px;border:1px solid #dee2e6;'>`;
          html += `<div style='font-weight:600;margin-bottom:0.5em;'>Test Execution Results:</div>`;

          result.testResults.summary.forEach((line) => {
            if (line.trim()) {
              html += `<div style='margin:0.2em 0;font-family:monospace;font-size:0.9em;'>${line}</div>`;
            } else {
              html += `<div style='margin:0.5em 0;'></div>`;
            }
          });

          html += `</div>`;
        }

        responsePlaceholder.innerHTML = html;
        responseContainer.style.background = "#eafaf1";
        responseContainer.style.color = "#27ae60";
      } else {
        let html = `<div style='font-weight:600;color:#c0392b;margin-bottom:1em;'>❌ Failed to generate or run test</div>`;

        if (result.testFileCreated) {
          html += `<div style='margin-bottom:0.8em;background:#fff3cd;padding:0.5em;border-radius:4px;'>
                     <strong>📁 Test file was created:</strong> ${result.testFileCreated.replace(
                       /.*\//,
                       ""
                     )}
                   </div>`;
        }

        if (result.error) {
          html += `<div style='background:#fdecea;padding:1em;border-radius:6px;border:1px solid:#f5c6cb;margin-top:0.8em;'>
                     <strong>Error:</strong><br>
                     <pre style='margin:0.5em 0 0 0;font-size:0.9em;white-space:pre-wrap;'>${result.error.replace(
                       /</g,
                       "&lt;"
                     )}</pre>`;

          // Show suggestions if available
          if (result.suggestions && result.suggestions.length > 0) {
            html += `<div style='margin-top:0.8em;'>
                       <strong>💡 Suggestions:</strong>
                       <ul style='margin:0.3em 0 0 1.2em;'>`;
            result.suggestions.forEach((suggestion) => {
              html += `<li style='margin:0.2em 0;'><code>${suggestion}</code></li>`;
            });
            html += `</ul></div>`;
          }

          html += `</div>`;
        }

        responsePlaceholder.innerHTML = html;
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

// Analysis Method Toggle Handler
document.addEventListener("DOMContentLoaded", function () {
  const analysisRadios = document.querySelectorAll(
    'input[name="analysisMethod"]'
  );
  const liveDescription = document.getElementById("live-description");
  const fileDescription = document.getElementById("file-description");

  // Update description based on selected method
  function updateAnalysisDescription() {
    const selectedMethod = document.querySelector(
      'input[name="analysisMethod"]:checked'
    ).value;

    if (selectedMethod === "live-ui") {
      liveDescription.classList.add("active");
      fileDescription.classList.remove("active");
    } else {
      liveDescription.classList.remove("active");
      fileDescription.classList.add("active");
    }
  }

  // Add event listeners to radio buttons
  analysisRadios.forEach((radio) => {
    radio.addEventListener("change", updateAnalysisDescription);
  });

  // Initialize description on page load
  updateAnalysisDescription();
});

/* Tambahkan style opsional untuk .btn-disabled di style.css:
.btn-disabled { opacity: 0.6; pointer-events: none; }
*/
