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
      if (result.success) {
        responsePlaceholder.innerHTML = result.testPlan
          .split("\n")
          .map((line) => `<p>${line}</p>`) // Format multi-paragraph response
          .join("");
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
        throw new Error("API did not return JSON. Response: " + (await res.text()));
      }
    } catch (err) {
      modelsErrorDiv.textContent = "Error: " + (err.message || err);
    } finally {
      fetchModelsBtn.disabled = false;
      fetchModelsBtn.textContent = "Show Bedrock Models";
    }
  });
}
