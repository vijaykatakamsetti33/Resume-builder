(function () {
  "use strict";

  const STORAGE_KEY = "resumeBuilderData_v1";

  /* ---------------------------------------------------
     STATE
  --------------------------------------------------- */
  let skills = [];
  let rowCounter = 0;
  let saveTimer = null;

  /* ---------------------------------------------------
     ELEMENT REFERENCES
  --------------------------------------------------- */
  const el = {
    fullName: document.getElementById("fullName"),
    email: document.getElementById("email"),
    phone: document.getElementById("phone"),
    location: document.getElementById("location"),
    linkedin: document.getElementById("linkedin"),
    github: document.getElementById("github"),
    portfolio: document.getElementById("portfolio"),
    summary: document.getElementById("summary"),

    educationList: document.getElementById("educationList"),
    addEducation: document.getElementById("addEducation"),

    experienceList: document.getElementById("experienceList"),
    addExperience: document.getElementById("addExperience"),

    projectList: document.getElementById("projectList"),
    addProject: document.getElementById("addProject"),

    certList: document.getElementById("certList"),
    addCertification: document.getElementById("addCertification"),

    skillInput: document.getElementById("skillInput"),
    skillChips: document.getElementById("skillChips"),

    clearForm: document.getElementById("clearForm"),
    downloadPdf: document.getElementById("downloadPdf"),

    progressFill: document.getElementById("progressFill"),
    progressPercent: document.getElementById("progressPercent"),
    saveIndicator: document.getElementById("saveIndicator"),

    // preview
    prevName: document.getElementById("prevName"),
    prevSummaryLine: document.getElementById("prevSummaryLine"),
    prevContact: document.getElementById("prevContact"),
    prevLinks: document.getElementById("prevLinks"),
    prevSummary: document.getElementById("prevSummary"),
    prevEducation: document.getElementById("prevEducation"),
    prevSkills: document.getElementById("prevSkills"),
    prevExperience: document.getElementById("prevExperience"),
    prevProjects: document.getElementById("prevProjects"),
    prevCertifications: document.getElementById("prevCertifications"),

    secSummary: document.getElementById("secSummary"),
    secEducation: document.getElementById("secEducation"),
    secSkills: document.getElementById("secSkills"),
    secExperience: document.getElementById("secExperience"),
    secProjects: document.getElementById("secProjects"),
    secCertifications: document.getElementById("secCertifications"),
  };

  /* ---------------------------------------------------
     GENERIC REPEATING ROW BUILDER
     Each row type is described by a list of fields:
     { key, label, placeholder, type: 'text'|'textarea' }
  --------------------------------------------------- */
  const ROW_TYPES = {
    education: {
      listEl: el.educationList,
      fields: [
        { key: "school", label: "School / University", placeholder: "XYZ University" },
        { key: "degree", label: "Degree", placeholder: "B.Tech, Computer Science" },
        { key: "years", label: "Years", placeholder: "2022 — 2026", fullWidth: true },
      ],
    },
    experience: {
      listEl: el.experienceList,
      fields: [
        { key: "role", label: "Role", placeholder: "Frontend Developer Intern" },
        { key: "company", label: "Company", placeholder: "Vault of Codes" },
        { key: "duration", label: "Duration", placeholder: "Jun 2026 — Present", fullWidth: true },
        { key: "desc", label: "What you did", placeholder: "Built and shipped a responsive interactive UI feature...", type: "textarea", fullWidth: true },
      ],
    },
    project: {
      listEl: el.projectList,
      fields: [
        { key: "title", label: "Project name", placeholder: "Interactive Resume Builder" },
        { key: "tech", label: "Tech used", placeholder: "HTML, CSS, JavaScript" },
        { key: "link", label: "Link", placeholder: "github.com/you/project", fullWidth: true },
        { key: "desc", label: "Description", placeholder: "What the project does and what you built...", type: "textarea", fullWidth: true },
      ],
    },
    certification: {
      listEl: el.certList,
      fields: [
        { key: "name", label: "Certification name", placeholder: "AWS Cloud Practitioner" },
        { key: "issuer", label: "Issued by", placeholder: "Amazon Web Services" },
        { key: "year", label: "Year", placeholder: "2026", fullWidth: true },
      ],
    },
  };

  function createRow(typeName) {
    const config = ROW_TYPES[typeName];
    rowCounter++;
    const id = typeName + "-" + rowCounter;

    const row = document.createElement("div");
    row.className = "repeat-row";
    row.dataset.id = id;
    row.dataset.type = typeName;

    const controls = document.createElement("div");
    controls.className = "row-controls";
    controls.innerHTML = `
      <button type="button" class="move-row" data-dir="up" title="Move up">↑</button>
      <button type="button" class="move-row" data-dir="down" title="Move down">↓</button>
      <button type="button" class="remove-row" title="Remove">Remove ✕</button>
    `;
    row.appendChild(controls);

    config.fields.forEach((f) => {
      const wrap = document.createElement("div");
      wrap.className = "field";
      wrap.dataset.fieldWrap = f.fullWidth ? "full" : "half";
      const inputTag = f.type === "textarea"
        ? `<textarea class="row-field" data-key="${f.key}" rows="3" placeholder="${f.placeholder}"></textarea>`
        : `<input type="text" class="row-field" data-key="${f.key}" placeholder="${f.placeholder}">`;
      wrap.innerHTML = `<label>${f.label}</label>${inputTag}`;
      row.appendChild(wrap);
    });

    // group non-fullWidth fields in pairs visually using field-row wrapper
    groupHalfFields(row);

    config.listEl.appendChild(row);
    bindRow(row);
    return row;
  }

  function groupHalfFields(row) {
    const halves = [...row.querySelectorAll('[data-field-wrap="half"]')];
    if (halves.length < 2) return;
    const pairWrap = document.createElement("div");
    pairWrap.className = "field-row";
    halves[0].before(pairWrap);
    halves.slice(0, 2).forEach((h) => pairWrap.appendChild(h));
  }

  function bindRow(row) {
    row.querySelectorAll(".row-field").forEach((input) => {
      input.addEventListener("input", onFormChange);
    });
    row.querySelector(".remove-row").addEventListener("click", () => {
      row.style.opacity = "0";
      row.style.transform = "translateY(-6px)";
      setTimeout(() => {
        row.remove();
        onFormChange();
      }, 180);
    });
    row.querySelectorAll(".move-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = btn.dataset.dir;
        if (dir === "up" && row.previousElementSibling) {
          row.parentElement.insertBefore(row, row.previousElementSibling);
        } else if (dir === "down" && row.nextElementSibling) {
          row.parentElement.insertBefore(row.nextElementSibling, row);
        }
        onFormChange();
      });
    });
  }

  function readRows(typeName) {
    const config = ROW_TYPES[typeName];
    return [...config.listEl.querySelectorAll(".repeat-row")].map((row) => {
      const data = {};
      row.querySelectorAll(".row-field").forEach((input) => {
        data[input.dataset.key] = input.value.trim();
      });
      return data;
    });
  }

  function rowHasContent(data) {
    return Object.values(data).some((v) => v && v.length);
  }

  /* ---------------------------------------------------
     SKILLS (tag input)
  --------------------------------------------------- */
  function addSkill(value) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
    skills.push(trimmed);
    renderSkillChips();
    onFormChange();
  }

  function removeSkill(index) {
    skills.splice(index, 1);
    renderSkillChips();
    onFormChange();
  }

  function renderSkillChips() {
    el.skillChips.innerHTML = "";
    skills.forEach((skill, index) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.innerHTML = `${escapeHtml(skill)} <button type="button" aria-label="Remove ${escapeHtml(skill)}">×</button>`;
      chip.querySelector("button").addEventListener("click", () => removeSkill(index));
      el.skillChips.appendChild(chip);
    });
  }

  el.skillInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill(el.skillInput.value);
      el.skillInput.value = "";
    }
  });

  /* ---------------------------------------------------
     HELPERS
  --------------------------------------------------- */
  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function toggleSection(sectionEl, show) {
    if (show && sectionEl.hasAttribute("hidden")) {
      sectionEl.removeAttribute("hidden");
    } else if (!show && !sectionEl.hasAttribute("hidden")) {
      sectionEl.setAttribute("hidden", "");
    }
  }

  /* ---------------------------------------------------
     LIVE PREVIEW
  --------------------------------------------------- */
  function updatePreview() {
    el.prevName.textContent = el.fullName.value.trim() || "Your Name";

    const contactBits = [];
    if (el.email.value.trim()) contactBits.push(el.email.value.trim());
    if (el.phone.value.trim()) contactBits.push(el.phone.value.trim());
    if (el.location.value.trim()) contactBits.push(el.location.value.trim());
    el.prevContact.innerHTML = contactBits.map((b) => `<span>${escapeHtml(b)}</span>`).join("");

    const linkBits = [];
    if (el.linkedin.value.trim()) linkBits.push(el.linkedin.value.trim());
    if (el.github.value.trim()) linkBits.push(el.github.value.trim());
    if (el.portfolio.value.trim()) linkBits.push(el.portfolio.value.trim());
    el.prevLinks.innerHTML = linkBits.map((b) => `<span>${escapeHtml(b)}</span>`).join("");

    const summaryVal = el.summary.value.trim();
    el.prevSummaryLine.textContent = summaryVal
      ? summaryVal.slice(0, 70) + (summaryVal.length > 70 ? "…" : "")
      : "Your headline will appear here";
    el.prevSummary.textContent = summaryVal;
    toggleSection(el.secSummary, !!summaryVal);

    // Education
    const eduData = readRows("education").filter(rowHasContent);
    el.prevEducation.innerHTML = eduData.map((d) => `
      <div class="entry">
        <div class="entry__top">
          <span>${escapeHtml(d.school || "School / University")}</span>
          <span class="entry__meta">${escapeHtml(d.years || "")}</span>
        </div>
        <div class="entry__sub">${escapeHtml(d.degree || "")}</div>
      </div>
    `).join("");
    toggleSection(el.secEducation, eduData.length > 0);

    // Skills
    el.prevSkills.innerHTML = skills.map((s) => `<span>${escapeHtml(s)}</span>`).join("");
    toggleSection(el.secSkills, skills.length > 0);

    // Experience
    const expData = readRows("experience").filter(rowHasContent);
    el.prevExperience.innerHTML = expData.map((d) => `
      <div class="entry">
        <div class="entry__top">
          <span>${escapeHtml(d.role || "Role")}</span>
          <span class="entry__meta">${escapeHtml(d.duration || "")}</span>
        </div>
        <div class="entry__sub">${escapeHtml(d.company || "")}</div>
        <p class="entry__desc">${escapeHtml(d.desc || "")}</p>
      </div>
    `).join("");
    toggleSection(el.secExperience, expData.length > 0);

    // Projects
    const projData = readRows("project").filter(rowHasContent);
    el.prevProjects.innerHTML = projData.map((d) => `
      <div class="entry">
        <div class="entry__top">
          <span>${escapeHtml(d.title || "Project")}</span>
          <span class="entry__meta">${escapeHtml(d.link || "")}</span>
        </div>
        <div class="entry__sub">${escapeHtml(d.tech || "")}</div>
        <p class="entry__desc">${escapeHtml(d.desc || "")}</p>
      </div>
    `).join("");
    toggleSection(el.secProjects, projData.length > 0);

    // Certifications
    const certData = readRows("certification").filter(rowHasContent);
    el.prevCertifications.innerHTML = certData.map((d) => `
      <div class="entry">
        <div class="entry__top">
          <span>${escapeHtml(d.name || "Certification")}</span>
          <span class="entry__meta">${escapeHtml(d.year || "")}</span>
        </div>
        <div class="entry__sub">${escapeHtml(d.issuer || "")}</div>
      </div>
    `).join("");
    toggleSection(el.secCertifications, certData.length > 0);

    updateProgress(eduData, expData);
  }

  /* ---------------------------------------------------
     PROGRESS BAR
  --------------------------------------------------- */
  function updateProgress(eduData, expData) {
    const checks = [
      el.fullName.value.trim(),
      el.email.value.trim(),
      el.phone.value.trim(),
      el.summary.value.trim(),
      eduData.length > 0 ? "x" : "",
      skills.length > 0 ? "x" : "",
      expData.length > 0 ? "x" : "",
    ];
    const filled = checks.filter(Boolean).length;
    const percent = Math.round((filled / checks.length) * 100);
    el.progressFill.style.width = percent + "%";
    el.progressPercent.textContent = percent;
  }

  /* ---------------------------------------------------
     AUTOSAVE (localStorage)
  --------------------------------------------------- */
  function collectState() {
    return {
      personal: {
        fullName: el.fullName.value,
        email: el.email.value,
        phone: el.phone.value,
        location: el.location.value,
        linkedin: el.linkedin.value,
        github: el.github.value,
        portfolio: el.portfolio.value,
      },
      summary: el.summary.value,
      education: readRows("education"),
      experience: readRows("experience"),
      projects: readRows("project"),
      certifications: readRows("certification"),
      skills: skills,
      theme: document.body.dataset.theme || "brass",
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState()));
      el.saveIndicator.textContent = "All changes saved";
      el.saveIndicator.style.opacity = "0.85";
    } catch (e) {
      el.saveIndicator.textContent = "Autosave unavailable";
    }
  }

  function scheduleSave() {
    el.saveIndicator.textContent = "Saving…";
    el.saveIndicator.style.opacity = "0.5";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 500);
  }

  function loadState() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return false;
    }
    if (!raw) return false;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return false;
    }

    const p = data.personal || {};
    el.fullName.value = p.fullName || "";
    el.email.value = p.email || "";
    el.phone.value = p.phone || "";
    el.location.value = p.location || "";
    el.linkedin.value = p.linkedin || "";
    el.github.value = p.github || "";
    el.portfolio.value = p.portfolio || "";
    el.summary.value = data.summary || "";

    (data.education || []).forEach((d) => fillRow(createRow("education"), d));
    (data.experience || []).forEach((d) => fillRow(createRow("experience"), d));
    (data.projects || []).forEach((d) => fillRow(createRow("project"), d));
    (data.certifications || []).forEach((d) => fillRow(createRow("certification"), d));

    skills = Array.isArray(data.skills) ? data.skills : [];
    renderSkillChips();

    if (data.theme) applyTheme(data.theme);

    return true;
  }

  function fillRow(row, data) {
    row.querySelectorAll(".row-field").forEach((input) => {
      if (data[input.dataset.key] !== undefined) input.value = data[input.dataset.key];
    });
  }

  function onFormChange() {
    updatePreview();
    scheduleSave();
  }

  /* ---------------------------------------------------
     THEME SWITCHER
  --------------------------------------------------- */
  function applyTheme(name) {
    document.body.dataset.theme = name;
    document.querySelectorAll(".theme-dot").forEach((dot) => {
      dot.classList.toggle("is-active", dot.dataset.theme === name);
    });
  }

  document.querySelectorAll(".theme-dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      applyTheme(dot.dataset.theme);
      scheduleSave();
    });
  });

  /* ---------------------------------------------------
     ACTIONS
  --------------------------------------------------- */
  el.addEducation.addEventListener("click", () => { createRow("education"); onFormChange(); });
  el.addExperience.addEventListener("click", () => { createRow("experience"); onFormChange(); });
  el.addProject.addEventListener("click", () => { createRow("project"); onFormChange(); });
  el.addCertification.addEventListener("click", () => { createRow("certification"); onFormChange(); });

  el.clearForm.addEventListener("click", () => {
    if (!confirm("Clear the whole form? This can't be undone.")) return;
    document.getElementById("resumeForm").reset();
    el.educationList.innerHTML = "";
    el.experienceList.innerHTML = "";
    el.projectList.innerHTML = "";
    el.certList.innerHTML = "";
    skills = [];
    renderSkillChips();
    createRow("education");
    createRow("experience");
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* no-op */ }
    onFormChange();
  });

  el.downloadPdf.addEventListener("click", () => {
    window.print();
  });

  [el.fullName, el.email, el.phone, el.location, el.linkedin, el.github, el.portfolio, el.summary].forEach((input) => {
    input.addEventListener("input", onFormChange);
  });

  /* ---------------------------------------------------
     INIT
  --------------------------------------------------- */
  const restored = loadState();
  if (!restored) {
    createRow("education");
    createRow("experience");
  }
  updatePreview();
})();
