import { initSharedExperience } from "../main.js";
import { aboutEvidence, aboutValues } from "../data.js";

function renderValues() {
  const container = document.querySelector("[data-values-grid]");
  if (!container) {
    return;
  }

  aboutValues.forEach((value) => {
    const card = document.createElement("article");
    card.className = "value-card surface reveal";
    card.innerHTML = `
      <h3>${value.title}</h3>
      <p>${value.description}</p>
    `;
    container.append(card);
  });
}

function renderEvidence() {
  const container = document.querySelector("[data-evidence-grid]");
  if (!container) {
    return;
  }

  aboutEvidence.forEach((item) => {
    const card = document.createElement("article");
    card.className = "evidence-card surface reveal";
    card.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.description}</p>
    `;
    container.append(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderValues();
  renderEvidence();
  initSharedExperience();
});
