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
