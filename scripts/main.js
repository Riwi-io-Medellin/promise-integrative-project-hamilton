import { initRevealAnimations } from "./ui/reveal.js";
import { initPromiseVoiceWidget } from "./ui/widget.js";

const PROMISE_ELEVENLABS_AGENT_ID = "agent_4501khbynht9ennvk32madk7k1jj";

function initNavigation() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.querySelector("[data-nav-links]");

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  const page = document.body.dataset.page || "";
  document.querySelectorAll("[data-nav-page]").forEach((link) => {
    if (link.dataset.navPage === page) {
      link.classList.add("active");
    }
  });
}

function setFooterYear() {
  const target = document.querySelector("[data-current-year]");
  if (target) {
    target.textContent = String(new Date().getFullYear());
  }
}

export function initSharedExperience() {
  initNavigation();
  setFooterYear();
  initRevealAnimations();
  initPromiseVoiceWidget({
    mode: import.meta.env.VITE_ELEVENLABS_MODE || "live",
    agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID || PROMISE_ELEVENLABS_AGENT_ID
  });
}
