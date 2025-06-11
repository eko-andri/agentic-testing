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
  let lastStatus = "";
  window.lastPrompts = window.lastPrompts || {
    promptEngineer: "",
    criticAgent: "",
    testGenerator: "",
  };
  const evtSource = new EventSource("http://localhost:3333/api/progress");
  evtSource.onmessage = function (event) {
    const data = JSON.parse(event.data);
    // Status sudah dalam dua baris, tampilkan di response-container saja
    lastStatus = data.status;
    if (responsePlaceholder) {
      let promptText = data.prompt || "";
      // Pisahkan status menjadi dua baris: agent (bold), proses (normal)
      let statusAgent = data.status;
      let statusProcess = "";
      if (data.status && data.status.includes("\n")) {
        const split = data.status.split("\n");
        statusAgent = split[0];
        statusProcess = split.slice(1).join(" ").trim();
      }
      // Jika ada playwrightCode di data, tampilkan kode Playwright, bukan prompt
      if (data.playwrightCode) {
        responsePlaceholder.innerHTML =
          `<div style='font-weight:600;'>${statusAgent}</div>` +
          (statusProcess ? `<div style='font-weight:400;margin-bottom:0.5em;'>${statusProcess}</div>` : "") +
          `<div style='margin-top:0.3em;'><span style='font-size:0.98em;color:#555;'>Playwright Code:</span><br><pre style='background:#222;color:#fff;padding:1em;border-radius:8px;overflow-x:auto;font-size:0.92em;font-family:inherit;'>${data.playwrightCode.replace(/</g, "&lt;")}</pre></div>`;
      } else {
        responsePlaceholder.innerHTML =
          `<div style='font-weight:600;'>${statusAgent}</div>` +
          (statusProcess ? `<div style='font-weight:400;margin-bottom:0.5em;'>${statusProcess}</div>` : "") +
          (promptText
            ? `<div style='margin-top:0.3em;'><span style='font-size:0.98em;color:#555;'>Prompt:</span><br><pre style='background:#f4f4f4;padding:0.7em;border-radius:6px;white-space:pre-wrap;font-size:0.92em;font-family:inherit;'>${promptText.replace(/</g, "&lt;")}</pre></div>`
            : "");
      }
    }
  };
  evtSource.onerror = function () {
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
