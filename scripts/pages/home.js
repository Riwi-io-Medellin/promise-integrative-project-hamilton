import { initSharedExperience } from "../main.js";
import {
  agentData,
  faqData,
  implementationSteps,
  integrations,
  kpiData,
  roadmap,
  useCases
} from "../data.js";
import { initAgentsExperience } from "../ui/agents.js";

function renderTicker() {
  const track = document.querySelector("[data-metrics-track]");
  if (!track) {
    return;
  }

  const repeated = [...kpiData, ...kpiData];
  repeated.forEach((item) => {
    const node = document.createElement("div");
    node.className = "metrics-item";
    node.innerHTML = `<strong>${item.value}</strong><span>${item.label}</span>`;
    track.append(node);
  });
}

function renderKpis() {
  const container = document.querySelector("[data-kpi-grid]");
  if (!container) {
    return;
  }

  kpiData.forEach((item) => {
    const card = document.createElement("article");
    card.className = "stat-card surface reveal";
    card.innerHTML = `
      <p class="value">${item.value}</p>
      <h3>${item.label}</h3>
      <p>${item.description}</p>
    `;
    container.append(card);
  });
}

function renderUseCases() {
  const container = document.querySelector("[data-use-cases]");
  if (!container) {
    return;
  }

  useCases.forEach((useCase) => {
    const card = document.createElement("article");
    card.className = "use-case-card surface reveal";
    card.innerHTML = `
      <h3>${useCase.industry}</h3>
      <p><strong>Cómo se usa:</strong> ${useCase.how}</p>
      <p><strong>Impacto:</strong> ${useCase.impact}</p>
    `;
    container.append(card);
  });
}

function renderImplementation() {
  const container = document.querySelector("[data-implementation-grid]");
  if (!container) {
    return;
  }

  implementationSteps.forEach((step, index) => {
    const card = document.createElement("article");
    card.className = "implementation-step surface reveal";
    card.innerHTML = `
      <p class="index">0${index + 1}</p>
      <h3>${step.title}</h3>
      <p>${step.description}</p>
    `;
    container.append(card);
  });
}

function renderIntegrations() {
  const container = document.querySelector("[data-integrations-grid]");
  if (!container) {
    return;
  }

  integrations.forEach((integration) => {
    const card = document.createElement("article");
    card.className = "integration-card surface reveal";
    card.innerHTML = `
      <h3>${integration.name}</h3>
      <p>${integration.description}</p>
    `;
    container.append(card);
  });
}

function renderRoadmap() {
  const container = document.querySelector("[data-roadmap-grid]");
  if (!container) {
    return;
  }

  roadmap.forEach((item) => {
    const card = document.createElement("article");
    card.className = "roadmap-card reveal";
    card.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <span class="roadmap-badge">${item.status}</span>
    `;
    container.append(card);
  });
}

function renderFaq() {
  const container = document.querySelector("[data-faq-list]");
  if (!container) {
    return;
  }

  faqData.forEach((item, index) => {
    const article = document.createElement("article");
    article.className = `faq-item reveal ${index === 0 ? "open" : ""}`.trim();

    const questionId = `faq-${index + 1}`;
    const answerId = `faq-answer-${index + 1}`;

    article.innerHTML = `
      <button id="${questionId}" aria-expanded="${index === 0}" aria-controls="${answerId}">
        <span>${item.question}</span>
        <span class="symbol">${index === 0 ? "−" : "+"}</span>
      </button>
      <p id="${answerId}" role="region" aria-labelledby="${questionId}">${item.answer}</p>
    `;
    container.append(article);
  });

  container.querySelectorAll(".faq-item button").forEach((button) => {
    button.addEventListener("click", () => {
      const article = button.closest(".faq-item");
      const isOpen = article.classList.toggle("open");
      button.setAttribute("aria-expanded", String(isOpen));
      button.querySelector(".symbol").textContent = isOpen ? "−" : "+";
    });
  });
}

function renderHeroPulse() {
  const pulse = document.querySelector("[data-pulse-grid]");
  if (!pulse) {
    return;
  }

  for (let index = 0; index < 30; index += 1) {
    const dot = document.createElement("span");
    pulse.append(dot);
  }
}

function initAgents() {
  initAgentsExperience({
    panelsElement: document.querySelector("[data-agents-panels]"),
    detailElement: document.querySelector("[data-agent-detail]"),
    agents: agentData
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderTicker();
  renderKpis();
  renderUseCases();
  renderImplementation();
  renderIntegrations();
  renderRoadmap();
  renderFaq();
  renderHeroPulse();
  initAgents();
  initSharedExperience();
});
