import { initRevealAnimations } from "./ui/reveal.js";
import { initPromiseVoiceWidget } from "./ui/widget.js";

const PROMISE_ELEVENLABS_AGENT_ID = "agent_4501kksmbgj2fwnrzpkzjdk06bej";
const THEME_KEY = "promise-theme";

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

function initThemeToggle() {
  const root = document.documentElement;
  const savedTheme = localStorage.getItem(THEME_KEY);
  const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = savedTheme || (preferredDark ? "dark" : "light");
  root.dataset.theme = initialTheme;

  const navShell = document.querySelector(".nav-shell");
  if (!navShell || navShell.querySelector("[data-theme-toggle]")) {
    return;
  }

  let actionWrap = navShell.querySelector(".nav-actions");
  if (!actionWrap) {
    actionWrap = document.createElement("div");
    actionWrap.className = "nav-actions";
    navShell.append(actionWrap);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "theme-toggle";
  button.dataset.themeToggle = "true";
  button.setAttribute("aria-label", "Cambiar entre modo claro y oscuro");

  const updateLabel = () => {
    const isDark = root.dataset.theme !== "light";
    button.textContent = isDark ? "Modo claro" : "Modo oscuro";
  };

  button.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem(THEME_KEY, root.dataset.theme);
    updateLabel();
  });

  updateLabel();
  actionWrap.append(button);
}

export function initSharedExperience() {
  initNavigation();
  initThemeToggle();
  setFooterYear();
  initRevealAnimations();
  initPromiseVoiceWidget({
    mode: import.meta.env.VITE_ELEVENLABS_MODE || "live",
    agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID || PROMISE_ELEVENLABS_AGENT_ID,
    title: "Promi, agente asesor",
    logoSrc: "./assets/brand/ISOLOGO-CLARO.png"
  });
}
