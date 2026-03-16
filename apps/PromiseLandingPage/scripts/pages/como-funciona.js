import { initSharedExperience } from "../main.js";
import { architectureBlocks, processFlow, qualityPillars } from "../data.js";

function renderFlow() {
  const container = document.querySelector("[data-flow-grid]");
  if (!container) {
    return;
  }

  processFlow.forEach((step) => {
    const card = document.createElement("article");
    card.className = "flow-card surface reveal";
    card.innerHTML = `
      <p class="index">${step.title.split(".")[0]}</p>
      <h3>${step.title}</h3>
      <p>${step.description}</p>
    `;
    container.append(card);
  });
}

function renderArchitecture() {
  const container = document.querySelector("[data-architecture-grid]");
  if (!container) {
    return;
  }

  architectureBlocks.forEach((block) => {
    const card = document.createElement("article");
    card.className = "architecture-card surface reveal";
    card.innerHTML = `
      <h3>${block.title}</h3>
      <p>${block.description}</p>
    `;
    container.append(card);
  });
}

function renderQuality() {
  const container = document.querySelector("[data-quality-grid]");
  if (!container) {
    return;
  }

  qualityPillars.forEach((pillar) => {
    const card = document.createElement("article");
    card.className = "quality-card surface reveal";
    card.innerHTML = `
      <h3>${pillar.title}</h3>
      <p>${pillar.description}</p>
    `;
    container.append(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderFlow();
  renderArchitecture();
  renderQuality();
  initSharedExperience();
});
