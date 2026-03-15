function createAmbient(agentId) {
  if (agentId === "sofia") {
    const wrap = document.createElement("div");
    wrap.className = "ambient ambient-wave";
    const heights = [22, 42, 65, 30, 78, 52, 88, 36, 74, 45, 58, 30];
    heights.forEach((height) => {
      const bar = document.createElement("span");
      bar.style.height = `${height}%`;
      wrap.append(bar);
    });
    return wrap;
  }

  if (agentId === "modular") {
    const wrap = document.createElement("div");
    wrap.className = "ambient ambient-grid";
    return wrap;
  }

  const wrap = document.createElement("div");
  wrap.className = "ambient ambient-chat";
  return wrap;
}

function createPanel(agent, index) {
  const panel = document.createElement("article");
  panel.className = "agent-panel";
  panel.dataset.agentId = agent.id;
  panel.dataset.agentTheme = agent.theme;
  panel.role = "button";
  panel.tabIndex = 0;
  panel.setAttribute("aria-expanded", index === 0 ? "true" : "false");

  const header = document.createElement("div");
  header.className = "agent-header";

  const panelIndex = document.createElement("p");
  panelIndex.className = "agent-index";
  panelIndex.textContent = `${agent.index} · Agente`;

  const panelName = document.createElement("h3");
  panelName.className = "agent-name";
  panelName.textContent = agent.name;

  const role = document.createElement("p");
  role.className = "agent-role";
  role.textContent = agent.role;

  const status = document.createElement("span");
  status.className = "agent-status";
  status.textContent = agent.status;

  header.append(panelIndex, panelName, role, status);
  panel.append(header, createAmbient(agent.id));

  return panel;
}

function createDetailSection(title, values) {
  const box = document.createElement("section");
  box.className = "detail-box";

  const heading = document.createElement("h4");
  heading.textContent = title;

  const list = document.createElement("ul");
  values.forEach((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    list.append(item);
  });

  box.append(heading, list);
  return box;
}

function renderAgentDetail(container, agent) {
  container.replaceChildren();

  const head = document.createElement("header");
  head.className = "agent-detail-head";

  const left = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = `${agent.name} · ${agent.role}`;
  const description = document.createElement("p");
  description.textContent = agent.summary;
  left.append(title, description);

  const status = document.createElement("span");
  status.className = "chip";
  status.textContent = agent.status;
  head.append(left, status);

  const grid = document.createElement("div");
  grid.className = "agent-detail-grid";
  grid.append(
    createDetailSection("Capacidades", agent.capabilities),
    createDetailSection("Arquitectura", agent.architecture)
  );

  const channelWrap = document.createElement("section");
  channelWrap.className = "detail-box";
  const channelTitle = document.createElement("h4");
  channelTitle.textContent = "Canales";
  const channelText = document.createElement("p");
  channelText.textContent = agent.channels.join(" · ");
  channelText.style.margin = "0.7rem 0 0";
  channelText.style.color = "rgba(247, 207, 198, 0.88)";
  channelWrap.append(channelTitle, channelText);

  const kpiWrap = document.createElement("div");
  kpiWrap.className = "detail-kpis";
  agent.kpis.forEach((kpi) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = kpi;
    kpiWrap.append(chip);
  });

  container.append(head, grid, channelWrap, kpiWrap);
}

export function initAgentsExperience({ panelsElement, detailElement, agents }) {
  if (!panelsElement || !detailElement || !agents?.length) {
    return;
  }

  const panels = agents.map((agent, index) => createPanel(agent, index));
  panelsElement.append(...panels);

  let activeAgentId = agents[0].id;

  const activateAgent = (agentId) => {
    const agent = agents.find((item) => item.id === agentId);
    if (!agent) {
      return;
    }

    activeAgentId = agentId;
    panels.forEach((panel) => {
      const isActive = panel.dataset.agentId === activeAgentId;
      panel.classList.toggle("active", isActive);
      panel.setAttribute("aria-expanded", String(isActive));
    });

    renderAgentDetail(detailElement, agent);
  };

  panels.forEach((panel) => {
    panel.addEventListener("click", () => activateAgent(panel.dataset.agentId));
    panel.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      activateAgent(panel.dataset.agentId);
    });
  });

  activateAgent(activeAgentId);
}
