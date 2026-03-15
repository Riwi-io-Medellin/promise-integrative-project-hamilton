import { initSharedExperience } from "../main.js";
import { pricingMatrix, pricingTiers } from "../data.js";

function renderPricingCards() {
  const container = document.querySelector("[data-pricing-grid]");
  if (!container) {
    return;
  }

  pricingTiers.forEach((tier) => {
    const card = document.createElement("article");
    card.className = `pricing-card surface reveal ${tier.highlighted ? "highlight" : ""}`.trim();
    const featureItems = tier.features.map((feature) => `<li>${feature}</li>`).join("");

    card.innerHTML = `
      <h3>${tier.name}</h3>
      <p class="pricing-range">${tier.range}</p>
      <p>${tier.target}</p>
      <ul>${featureItems}</ul>
      <a class="btn btn-secondary" href="#cotizar">Solicitar cotización</a>
    `;
    container.append(card);
  });
}

function renderMatrix() {
  const root = document.querySelector("[data-pricing-matrix]");
  if (!root) {
    return;
  }

  const table = document.createElement("table");
  const [first, ...restColumns] = pricingMatrix.columns;

  const headRow = `
    <thead>
      <tr>
        <th>${first}</th>
        ${restColumns.map((column) => `<th>${column}</th>`).join("")}
      </tr>
    </thead>
  `;

  const bodyRows = pricingMatrix.rows
    .map((row) => {
      const [feature, starter, growth, scale] = row;
      return `
        <tr>
          <td>${feature}</td>
          <td class="${starter.toLowerCase().includes("parcial") ? "partial" : "good"}">${starter}</td>
          <td class="${growth.toLowerCase().includes("parcial") ? "partial" : "good"}">${growth}</td>
          <td>${scale}</td>
        </tr>
      `;
    })
    .join("");

  table.innerHTML = `${headRow}<tbody>${bodyRows}</tbody>`;
  root.append(table);
}

document.addEventListener("DOMContentLoaded", () => {
  renderPricingCards();
  renderMatrix();
  initSharedExperience();
});
