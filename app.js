(function() {
const supabaseUrl = "https://bacxentasykqnudoumje.supabase.co";
const supabaseKey = "sb_publishable_cjxf3oVYYl0LCafb5BjGPQ_EBTyXBnT";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const SETTINGS_KEY = "taskai_settings_v1";

const DEFAULT_MODEL = "claude-3-5-haiku-20241022";
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const state = {
  authMode: "signin",
  user: null,
  tasks: [],
  draftInsight: null,
  filters: {
    search: "",
    status: "all",
    priority: "all",
    category: "all",
  },
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();

  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    state.user = session.user;
    await fetchTasks();
    showApp();
  } else {
    showAuth();
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      els.resetPasswordDialog.showModal();
    } else if (event === 'SIGNED_IN' && session) {
      state.user = session.user;
      await fetchTasks();
      showApp();
      els.resetPasswordDialog.close();
    } else if (event === 'SIGNED_OUT') {
      state.user = null;
      state.tasks = [];
      showAuth();
    }
  });
}

function cacheElements() {
  [
    "authView",
    "appView",
    "authForm",
    "authName",
    "authEmail",
    "authPassword",
    "authError",
    "authSubmit",
    "nameGroup",
    "signInTab",
    "signUpTab",
    "userBadge",
    "logoutBtn",
    "summaryBtn",
    "settingsBtn",
    "taskForm",
    "taskTitle",
    "taskNotes",
    "taskCategory",
    "taskDueDate",
    "taskDueTime",
    "taskPriority",
    "analyzeDraftBtn",
    "draftInsight",
    "searchInput",
    "statusFilter",
    "priorityFilter",
    "categoryFilter",
    "openCount",
    "dueSoonCount",
    "completionRate",
    "doneTodayCount",
    "priorityChart",
    "categoryChart",
    "visibleCount",
    "taskList",
    "settingsDialog",
    "settingsForm",
    "apiKeyInput",
    "modelInput",
    "summaryDialog",
    "summaryContent",
    "closeSummaryBtn",
    "closeSettingsBtn",
    "cancelSettingsBtn",
    "toast",
    "forgotPasswordBtn",
    "resendEmailBtn",
    "resetPasswordDialog",
    "resetPasswordForm",
    "newPasswordInput",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.signInTab.addEventListener("click", () => setAuthMode("signin"));
  els.signUpTab.addEventListener("click", () => setAuthMode("signup"));
  els.authForm.addEventListener("submit", handleAuthSubmit);
  els.forgotPasswordBtn.addEventListener("click", handleForgotPassword);
  els.resendEmailBtn.addEventListener("click", handleResendEmail);
  els.resetPasswordForm.addEventListener("submit", handleResetPassword);
  els.logoutBtn.addEventListener("click", logout);
  els.taskForm.addEventListener("submit", handleTaskSubmit);
  els.analyzeDraftBtn.addEventListener("click", analyzeDraftTask);
  els.searchInput.addEventListener("input", updateFilters);
  els.statusFilter.addEventListener("change", updateFilters);
  els.priorityFilter.addEventListener("change", updateFilters);
  els.categoryFilter.addEventListener("change", updateFilters);
  els.taskList.addEventListener("click", handleTaskClick);
  els.taskList.addEventListener("change", handleTaskChange);
  els.summaryBtn.addEventListener("click", openDailySummary);
  els.settingsBtn.addEventListener("click", openSettings);
  els.settingsForm.addEventListener("submit", saveSettings);
  els.closeSettingsBtn.addEventListener("click", () => els.settingsDialog.close());
  els.cancelSettingsBtn.addEventListener("click", () => els.settingsDialog.close());
  els.closeSummaryBtn.addEventListener("click", () => els.summaryDialog.close());
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isSignup = mode === "signup";
  els.signInTab.classList.toggle("active", !isSignup);
  els.signUpTab.classList.toggle("active", isSignup);
  els.nameGroup.classList.toggle("hidden", !isSignup);
  els.forgotPasswordBtn.classList.toggle("hidden", isSignup);
  els.resendEmailBtn.classList.toggle("hidden", !isSignup);
  els.authSubmit.textContent = isSignup ? "Create account" : "Sign in";
  els.authPassword.autocomplete = isSignup ? "new-password" : "current-password";
  els.authError.textContent = "";
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  requestNotificationPermission(); // Ask permission on explicit user interaction
  const email = normaliseEmail(els.authEmail.value);
  const password = els.authPassword.value.trim();
  const name = els.authName.value.trim() || email.split("@")[0] || "User";

  if (!email || !password) {
    setAuthError("Email and password are required.");
    return;
  }

  if (password.length < 6) {
    setAuthError("Use at least 6 characters.");
    return;
  }

  setLoading(els.authSubmit, true);

  try {
    els.authError.style.color = ""; // Reset to default error color

    if (state.authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      if (error) throw error;
      
      if (data.user && data.session === null) {
        setAuthError("Account created! Please check your email to verify your account.");
        els.authError.style.color = "var(--color-primary, #4A90E2)"; 
      }
      // onAuthStateChange handles the UI transition if auto-login occurs
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // onAuthStateChange handles the UI transition
    }
  } catch (err) {
    setAuthError(err.message || "Authentication failed.");
  } finally {
    setLoading(els.authSubmit, false);
  }
}

function setAuthError(message) {
  els.authError.textContent = message;
}

async function handleResendEmail() {
  const email = normaliseEmail(els.authEmail.value);
  if (!email) {
    els.authError.style.color = "var(--color-danger, #e74c3c)";
    setAuthError("Please enter your email address to resend the verification link.");
    return;
  }
  
  setLoading(els.resendEmailBtn, true, "Sending...");
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    if (error) throw error;
    
    els.authError.style.color = "var(--color-primary, #4A90E2)";
    setAuthError("Verification email resent! Please check your inbox and spam folder.");
  } catch (err) {
    els.authError.style.color = "var(--color-danger, #e74c3c)";
    setAuthError(err.message || "Failed to resend email.");
  } finally {
    setLoading(els.resendEmailBtn, false);
  }
}

async function handleForgotPassword() {
  const email = normaliseEmail(els.authEmail.value);
  if (!email) {
    els.authError.style.color = "var(--color-danger, #e74c3c)";
    setAuthError("Please enter your email address first to reset password.");
    return;
  }
  
  setLoading(els.forgotPasswordBtn, true, "Sending...");
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) throw error;
    
    els.authError.style.color = "var(--color-primary, #4A90E2)";
    setAuthError("Password reset email sent! Please check your inbox.");
  } catch (err) {
    els.authError.style.color = "var(--color-danger, #e74c3c)";
    setAuthError(err.message || "Failed to send reset email.");
  } finally {
    setLoading(els.forgotPasswordBtn, false);
  }
}

async function handleResetPassword(event) {
  event.preventDefault();
  const newPassword = els.newPasswordInput.value.trim();
  
  if (newPassword.length < 6) {
    showToast("Password must be at least 6 characters");
    return;
  }
  
  const submitBtn = els.resetPasswordForm.querySelector('button[type="submit"]');
  setLoading(submitBtn, true);
  
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    
    showToast("Password updated successfully!");
    els.resetPasswordDialog.close();
  } catch (err) {
    console.error(err);
    showToast("Failed to update password.");
  } finally {
    setLoading(submitBtn, false);
  }
}

function startSession(user) {
  // Deprecated
}

async function logout() {
  await supabase.auth.signOut();
  state.draftInsight = null;
  els.authForm.reset();
}

function showAuth() {
  els.authView.classList.remove("hidden");
  els.appView.classList.add("hidden");
  refreshIcons();
}

function showApp() {
  els.authView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  els.userBadge.textContent = state.user.email;
  
  const titleEl = document.getElementById("workspaceTitle");
  if (titleEl) {
    const name = state.user.user_metadata?.name || state.user.email.split("@")[0];
    titleEl.textContent = name ? `${name}'s Workspace` : "Workspace";
  }
  
  requestNotificationPermission();
  checkDeadlines();
  
  renderAll();
}

function seedTasksIfEmpty(user) {
  // Handled by DB defaults if needed
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  requestNotificationPermission(); // Ask permission when interacting
  const title = els.taskTitle.value.trim();
  if (!title) return;

  const insight = state.draftInsight;
  const now = new Date().toISOString();
  const task = {
    id: crypto.randomUUID(),
    title,
    notes: els.taskNotes.value.trim(),
    category: els.taskCategory.value,
    dueDate: els.taskDueDate.value ? `${els.taskDueDate.value}T${els.taskDueTime.value || "23:59"}` : "",
    priority: normalisePriority(insight?.priority || els.taskPriority.value),
    aiReason: insight?.reason || "",
    subtasks: (insight?.subtasks || []).map(makeSubtask),
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  state.tasks.unshift(task);
  state.draftInsight = null;
  els.taskForm.reset();
  els.taskCategory.value = "Internship";
  els.taskPriority.value = "medium";
  els.taskDueTime.value = "";
  renderDraftInsight();
  renderAll();

  // Persist to Supabase
  const { error } = await supabase.from('tasks').insert([taskToDb(task, state.user.id)]);
  if (error) {
    console.error(error);
    showToast("Failed to save task to database.");
  } else {
    showToast("Task added.");
  }
}

async function analyzeDraftTask() {
  const title = els.taskTitle.value.trim();
  if (!title) {
    showToast("Add a task title first.");
    els.taskTitle.focus();
    return;
  }

  setLoading(els.analyzeDraftBtn, true, "Analyzing");
  try {
    const payload = {
      title,
      notes: els.taskNotes.value.trim(),
      category: els.taskCategory.value,
      dueDate: els.taskDueDate.value,
    };
    const result = await getAiTaskAnalysis(payload);
    state.draftInsight = result;
    els.taskPriority.value = result.priority;
    renderDraftInsight();
    showToast(result.source === "local" ? "Local analysis applied." : "AI analysis applied.");
  } catch (error) {
    console.error(error);
    showToast("Could not analyze this task.");
  } finally {
    setLoading(els.analyzeDraftBtn, false);
  }
}

function updateFilters() {
  state.filters.search = els.searchInput.value.trim().toLowerCase();
  state.filters.status = els.statusFilter.value;
  state.filters.priority = els.priorityFilter.value;
  state.filters.category = els.categoryFilter.value;
  renderTaskList();
}

function handleTaskClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "delete") {
    if (!confirm("Delete this task?")) return;
    state.tasks = state.tasks.filter((task) => task.id !== id);
    renderAll();
    
    supabase.from('tasks').delete().eq('id', id).then(({error}) => {
      if (error) {
        console.error(error);
        showToast("Failed to delete task from database.");
      } else {
        showToast("Task deleted.");
      }
    });
  }

  if (action === "expand") {
    expandTask(id, button);
  }
}

function handleTaskChange(event) {
  const input = event.target;
  const id = input.dataset.id;
  if (!id) return;

  if (input.dataset.action === "toggle-task") {
    updateTask(id, {
      completed: input.checked,
      completedAt: input.checked ? new Date().toISOString() : null,
    });
  }

  if (input.dataset.action === "toggle-subtask") {
    const subtaskId = input.dataset.subtaskId;
    const now = new Date().toISOString();
    state.tasks = state.tasks.map((task) => {
      if (task.id !== id) return task;
      return {
        ...task,
        updatedAt: now,
        subtasks: task.subtasks.map((subtask) =>
          subtask.id === subtaskId ? { ...subtask, done: input.checked } : subtask,
        ),
      };
    });
    renderAll();

    const updatedTask = state.tasks.find((t) => t.id === id);
    if (updatedTask) {
      supabase.from('tasks').update({ subtasks: updatedTask.subtasks, updated_at: now }).eq('id', id);
    }
  }
}

async function expandTask(id, button) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;

  setLoading(button, true);
  try {
    const subtasks = await getAiSubtasks(task);
    const now = new Date().toISOString();
    state.tasks = state.tasks.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        subtasks: subtasks.map(makeSubtask),
        updatedAt: now,
      };
    });
    renderAll();
    
    const updatedTask = state.tasks.find((t) => t.id === id);
    if (updatedTask) {
      supabase.from('tasks').update({ subtasks: updatedTask.subtasks, updated_at: now }).eq('id', id);
    }
    showToast("Subtasks updated.");
  } catch (error) {
    console.error(error);
    showToast("Could not expand this task.");
  } finally {
    setLoading(button, false);
  }
}

async function openDailySummary() {
  if (!state.tasks.length) {
    showToast("Add a task first.");
    return;
  }

  setLoading(els.summaryBtn, true, "Summarizing");
  try {
    const summary = await getAiDailySummary(state.tasks);
    renderSummary(summary);
    els.summaryDialog.showModal();
    refreshIcons();
  } catch (error) {
    console.error(error);
    showToast("Could not create a summary.");
  } finally {
    setLoading(els.summaryBtn, false);
  }
}

function openSettings() {
  const settings = readSettings();
  els.apiKeyInput.value = settings.apiKey || "";
  els.modelInput.value = settings.model || DEFAULT_MODEL;
  els.settingsDialog.showModal();
  refreshIcons();
}

function saveSettings(event) {
  event.preventDefault();
  writeJson(SETTINGS_KEY, {
    apiKey: els.apiKeyInput.value.trim(),
    model: els.modelInput.value.trim() || DEFAULT_MODEL,
  });
  els.settingsDialog.close();
  showToast("Settings saved.");
}

function updateTask(id, patch) {
  const now = new Date().toISOString();
  state.tasks = state.tasks.map((task) =>
    task.id === id ? { ...task, ...patch, updatedAt: now } : task,
  );
  renderAll();

  const updatedTask = state.tasks.find((t) => t.id === id);
  if (updatedTask) {
    supabase.from('tasks').update(taskToDb(updatedTask, state.user.id)).eq('id', id);
  }
}

function renderAll() {
  renderCategoryFilter();
  renderDraftInsight();
  renderMetrics();
  renderCharts();
  renderTaskList();
  refreshIcons();
}

function renderDraftInsight() {
  const insight = state.draftInsight;
  if (!insight) {
    els.draftInsight.classList.add("hidden");
    els.draftInsight.innerHTML = "";
    return;
  }

  els.draftInsight.classList.remove("hidden");
  els.draftInsight.innerHTML = `
    <span class="priority-pill ${insight.priority}">${toTitleCase(insight.priority)}</span>
    <p>${escapeHtml(insight.reason)}</p>
    <ul>
      ${insight.subtasks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderMetrics() {
  const total = state.tasks.length;
  const open = state.tasks.filter((task) => !task.completed).length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const dueSoon = state.tasks.filter((task) => {
    const due = getDueState(task.dueDate);
    return !task.completed && (due.state === "overdue" || due.state === "soon");
  }).length;
  const doneToday = state.tasks.filter((task) => task.completedAt && isToday(task.completedAt)).length;

  els.openCount.textContent = open;
  els.dueSoonCount.textContent = dueSoon;
  els.completionRate.textContent = total ? `${Math.round((completed / total) * 100)}%` : "0%";
  els.doneTodayCount.textContent = doneToday;
}

function renderCharts() {
  const priorities = ["high", "medium", "low"];
  const maxPriority = Math.max(...priorities.map((priority) => countBy(state.tasks, "priority", priority)), 1);

  els.priorityChart.innerHTML = priorities
    .map((priority) => {
      const count = countBy(state.tasks, "priority", priority);
      return renderBarRow(toTitleCase(priority), count, (count / maxPriority) * 100, priority);
    })
    .join("");

  const categoryCounts = getCategoryStats();
  if (!categoryCounts.length) {
    els.categoryChart.innerHTML = renderBarRow("No tasks", 0, 0, "");
    return;
  }

  const maxCategory = Math.max(...categoryCounts.map((item) => item.total), 1);
  els.categoryChart.innerHTML = categoryCounts
    .slice(0, 5)
    .map((item) => renderBarRow(item.category, item.done, (item.done / maxCategory) * 100, ""))
    .join("");
}

function renderBarRow(label, count, value, tone) {
  return `
    <div class="bar-row">
      <span>${escapeHtml(label)}</span>
      <div class="bar-track">
        <div class="bar-fill ${tone}" style="--value: ${Math.max(value, 4)}%"></div>
      </div>
      <strong>${count}</strong>
    </div>
  `;
}

function renderCategoryFilter() {
  const current = els.categoryFilter.value || "all";
  const categories = Array.from(new Set(state.tasks.map((task) => task.category).filter(Boolean))).sort();
  els.categoryFilter.innerHTML = `<option value="all">All categories</option>${categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("")}`;
  els.categoryFilter.value = categories.includes(current) ? current : "all";
}

function renderTaskList() {
  const visible = getVisibleTasks();
  els.visibleCount.textContent = `${visible.length} shown`;

  if (!visible.length) {
    els.taskList.innerHTML = `
      <div class="empty-state">
        <p><strong>No matching tasks</strong>Try a different filter or add a new task.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  els.taskList.innerHTML = visible.map(renderTaskCard).join("");
  refreshIcons();
}

function renderTaskCard(task) {
  const due = getDueState(task.dueDate);
  const completedSubtasks = task.subtasks.filter((item) => item.done).length;
  const progress = task.subtasks.length ? Math.round((completedSubtasks / task.subtasks.length) * 100) : 0;

  return `
    <article class="task-card ${task.completed ? "completed" : ""}">
      <div class="task-topline">
        <input class="task-check" type="checkbox" data-action="toggle-task" data-id="${task.id}" ${task.completed ? "checked" : ""} aria-label="Complete task" />
        <div>
          <div class="task-title-row">
            <h3 class="task-title">${escapeHtml(task.title)}</h3>
            <span class="priority-pill ${task.priority}">${toTitleCase(task.priority)}</span>
            ${task.dueDate ? `<span class="due-pill ${due.state}">${escapeHtml(due.label)}</span>` : ""}
          </div>
          <div class="task-meta">
            <span>${escapeHtml(task.category || "General")}</span>
            <span>Created ${formatDate(task.createdAt)}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-button small-icon" type="button" data-action="expand" data-id="${task.id}" aria-label="Expand subtasks" title="Expand subtasks">
            <i data-lucide="sparkles"></i>
          </button>
          <button class="icon-button small-icon" type="button" data-action="delete" data-id="${task.id}" aria-label="Delete task" title="Delete task">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>

      ${task.notes ? `<p class="task-notes">${escapeHtml(task.notes)}</p>` : ""}
      ${task.aiReason ? `<p class="ai-reason">${escapeHtml(task.aiReason)}</p>` : ""}

      ${
        task.subtasks.length
          ? `
            <div class="progress-line">
              <span>${completedSubtasks}/${task.subtasks.length}</span>
              <div class="bar-track"><div class="bar-fill" style="--value: ${progress}%"></div></div>
            </div>
            <ul class="subtasks">
              ${task.subtasks
                .map(
                  (subtask) => `
                    <li>
                      <label>
                        <input type="checkbox" data-action="toggle-subtask" data-id="${task.id}" data-subtask-id="${subtask.id}" ${subtask.done ? "checked" : ""} />
                        <span>${escapeHtml(subtask.text)}</span>
                      </label>
                    </li>
                  `,
                )
                .join("")}
            </ul>
          `
          : ""
      }
    </article>
  `;
}

function getVisibleTasks() {
  const filtered = state.tasks.filter((task) => {
    const matchesSearch =
      !state.filters.search ||
      `${task.title} ${task.notes} ${task.category}`.toLowerCase().includes(state.filters.search);
    const matchesPriority = state.filters.priority === "all" || task.priority === state.filters.priority;
    const matchesCategory = state.filters.category === "all" || task.category === state.filters.category;
    const due = getDueState(task.dueDate);
    const matchesStatus =
      state.filters.status === "all" ||
      (state.filters.status === "open" && !task.completed) ||
      (state.filters.status === "done" && task.completed) ||
      (state.filters.status === "overdue" && !task.completed && due.state === "overdue");

    return matchesSearch && matchesPriority && matchesCategory && matchesStatus;
  });

  return filtered.sort(sortTasks);
}

function sortTasks(a, b) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;

  const aDue = getDueState(a.dueDate);
  const bDue = getDueState(b.dueDate);
  const dueWeight = { overdue: 0, soon: 1, later: 2, none: 3 };
  if (dueWeight[aDue.state] !== dueWeight[bDue.state]) {
    return dueWeight[aDue.state] - dueWeight[bDue.state];
  }

  if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  }

  const aDate = a.dueDate ? new Date(`${a.dueDate}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
  const bDate = b.dueDate ? new Date(`${b.dueDate}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
  if (aDate !== bDate) return aDate - bDate;

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

async function getAiTaskAnalysis(payload) {
  const settings = readSettings();
  const fallback = localTaskAnalysis(payload);

  if (!settings.apiKey) {
    return { ...fallback, source: "local" };
  }

  try {
    const data = await callAnthropicJson({
      settings,
      task: "task_analysis",
      payload,
      expected:
        '{"priority":"high|medium|low","reason":"one short sentence","subtasks":["action step","action step","action step"]}',
    });

    return {
      priority: normalisePriority(data.priority),
      reason: String(data.reason || fallback.reason).slice(0, 180),
      subtasks: normaliseSubtasks(data.subtasks, fallback.subtasks),
      source: "anthropic",
    };
  } catch (error) {
    console.warn("Anthropic task analysis failed. Falling back locally.", error);
    return { ...fallback, source: "local" };
  }
}

async function getAiSubtasks(task) {
  const settings = readSettings();
  const fallback = localSubtasks(task);

  if (!settings.apiKey) return fallback;

  try {
    const data = await callAnthropicJson({
      settings,
      task: "subtask_expansion",
      payload: task,
      expected: '{"subtasks":["step 1","step 2","step 3","step 4"]}',
    });
    return normaliseSubtasks(data.subtasks, fallback);
  } catch (error) {
    console.warn("Anthropic subtask expansion failed. Falling back locally.", error);
    return fallback;
  }
}

async function getAiDailySummary(tasks) {
  const settings = readSettings();
  const fallback = localDailySummary(tasks);

  if (!settings.apiKey) return fallback;

  try {
    const data = await callAnthropicJson({
      settings,
      task: "daily_summary",
      payload: {
        today: toDateInputValue(new Date()),
        tasks: tasks.map((task) => ({
          title: task.title,
          category: task.category,
          priority: task.priority,
          dueDate: task.dueDate,
          completed: task.completed,
          subtasksDone: task.subtasks.filter((item) => item.done).length,
          subtasksTotal: task.subtasks.length,
        })),
      },
      expected:
        '{"summary":"2-3 sentence summary","focus":"single recommended focus","risks":["risk"],"nextSteps":["step","step","step"]}',
    });

    return {
      summary: String(data.summary || fallback.summary),
      focus: String(data.focus || fallback.focus),
      risks: Array.isArray(data.risks) ? data.risks.slice(0, 4).map(String) : fallback.risks,
      nextSteps: Array.isArray(data.nextSteps) ? data.nextSteps.slice(0, 4).map(String) : fallback.nextSteps,
      source: "anthropic",
    };
  } catch (error) {
    console.warn("Anthropic daily summary failed. Falling back locally.", error);
    return fallback;
  }
}

async function callAnthropicJson({ settings, task, payload, expected }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: settings.model || DEFAULT_MODEL,
      max_tokens: 900,
      temperature: 0.2,
      system:
        "You are TaskAI. Return valid JSON only. Do not include markdown, comments, XML tags, or extra prose.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            task,
            expected,
            input: payload,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${message}`);
  }

  const data = await response.json();
  const text = (data.content || [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();

  return parseJsonFromText(text);
}

function localTaskAnalysis(task) {
  const text = `${task.title} ${task.notes} ${task.category}`.toLowerCase();
  let score = 0;

  [
    "urgent",
    "asap",
    "today",
    "deadline",
    "submit",
    "screening",
    "internship",
    "interview",
    "bug",
    "fix",
    "client",
    "production",
  ].forEach((word) => {
    if (text.includes(word)) score += 2;
  });

  ["learn", "practice", "read", "research", "later"].forEach((word) => {
    if (text.includes(word)) score -= 1;
  });

  const due = getDueState(task.dueDate);
  if (due.state === "overdue") score += 5;
  if (due.state === "soon") score += 3;

  const priority = score >= 5 ? "high" : score <= 0 ? "low" : "medium";
  const reason =
    priority === "high"
      ? "This has urgency signals or a near deadline, so it should stay near the top."
      : priority === "low"
        ? "This looks useful but not time-sensitive based on the current details."
        : "This is important enough to schedule, but it does not look like an immediate blocker.";

  return {
    priority,
    reason,
    subtasks: localSubtasks(task),
    source: "local",
  };
}

function localSubtasks(task) {
  const title = task.title || "the task";
  const category = (task.category || "").toLowerCase();

  if (category.includes("internship")) {
    return [
      `Clarify the deliverable for ${title}`,
      "Prepare a short architecture explanation",
      "Record or capture the working flow",
      "Submit the link with a concise note",
    ];
  }

  if (category.includes("learning")) {
    return [
      `Find one focused reference for ${title}`,
      "Build a small working example",
      "Write down the key implementation notes",
      "Apply the idea inside the project",
    ];
  }

  return [
    `Define the done state for ${title}`,
    "Break out the smallest next action",
    "Handle blockers or missing inputs",
    "Review and mark complete",
  ];
}

function localDailySummary(tasks) {
  const open = tasks.filter((task) => !task.completed);
  const high = open.filter((task) => task.priority === "high");
  const dueSoon = open.filter((task) => {
    const due = getDueState(task.dueDate);
    return due.state === "overdue" || due.state === "soon";
  });
  const completed = tasks.filter((task) => task.completed).length;
  const topTask = high[0] || dueSoon[0] || open[0];

  return {
    summary: `You have ${open.length} open tasks and ${completed} completed tasks. ${dueSoon.length} open task${dueSoon.length === 1 ? " is" : "s are"} overdue or due soon.`,
    focus: topTask ? topTask.title : "All tasks are complete.",
    risks: dueSoon.length
      ? dueSoon.slice(0, 3).map((task) => `${task.title} needs attention before the due date.`)
      : ["No urgent deadline risk detected."],
    nextSteps: topTask
      ? [`Start with ${topTask.title}`, "Finish one subtask before switching context", "Update the task status after review"]
      : ["Plan tomorrow's first task"],
    source: "local",
  };
}

function renderSummary(summary) {
  els.summaryContent.innerHTML = `
    <section>
      <h3>Overview</h3>
      <p>${escapeHtml(summary.summary)}</p>
    </section>
    <section>
      <h3>Focus</h3>
      <p>${escapeHtml(summary.focus)}</p>
    </section>
    <section>
      <h3>Risks</h3>
      <ul>${summary.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
    <section>
      <h3>Next steps</h3>
      <ul>${summary.nextSteps.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
  `;
}

function readUsers() {
  return readJson(USERS_KEY, {});
}

function readSettings() {
  return readJson(SETTINGS_KEY, { apiKey: "", model: DEFAULT_MODEL });
}

function readTasks(email) {
  return readJson(`${TASKS_PREFIX}${normaliseEmail(email)}`, []);
}

function writeTasks(email, tasks) {
  writeJson(`${TASKS_PREFIX}${normaliseEmail(email)}`, tasks);
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`Could not read ${key}`, error);
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function parseJsonFromText(text) {
  try {
    return JSON.parse(text);
  } catch {
    const objectStart = text.indexOf("{");
    const objectEnd = text.lastIndexOf("}");
    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
      return JSON.parse(text.slice(objectStart, objectEnd + 1));
    }

    const arrayStart = text.indexOf("[");
    const arrayEnd = text.lastIndexOf("]");
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      return JSON.parse(text.slice(arrayStart, arrayEnd + 1));
    }

    throw new Error("No JSON found in AI response.");
  }
}

function normaliseSubtasks(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const clean = value.map((item) => String(item).trim()).filter(Boolean);
  return clean.length ? clean.slice(0, 5) : fallback;
}

function makeSubtask(text) {
  if (typeof text === "object" && text.id) return text;
  return {
    id: crypto.randomUUID(),
    text: String(text).trim(),
    done: false,
  };
}

function getCategoryStats() {
  const map = new Map();
  state.tasks.forEach((task) => {
    const category = task.category || "General";
    const current = map.get(category) || { category, total: 0, done: 0 };
    current.total += 1;
    if (task.completed) current.done += 1;
    map.set(category, current);
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function countBy(items, key, value) {
  return items.filter((item) => item[key] === value).length;
}

function getDueState(dateString) {
  if (!dateString) return { state: "none", label: "" };

  const now = new Date();
  const due = dateString.includes("T") ? new Date(dateString) : new Date(`${dateString}T00:00:00`);
  
  const diffHours = (due.getTime() - now.getTime()) / 3600000;
  
  if (diffHours < 0) return { state: "overdue", label: `Overdue` };
  if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    const mins = Math.floor((diffHours - hours) * 60);
    if (hours === 0) return { state: "soon", label: `Due in ${mins}m` };
    return { state: "soon", label: `Due in ${hours}h ${mins}m` };
  }
  
  const diffDays = Math.round(diffHours / 24);
  if (diffDays <= 2) return { state: "soon", label: `Due in ${diffDays}d` };
  return { state: "later", label: formatDate(dateString) };
}

function normalisePriority(value) {
  const priority = String(value || "").toLowerCase();
  return ["high", "medium", "low"].includes(priority) ? priority : "medium";
}

function normaliseEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function encodePassword(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isToday(dateString) {
  return toDateInputValue(new Date(dateString)) === toDateInputValue(new Date());
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = dateString.includes("T") ? new Date(dateString) : new Date(`${dateString}T00:00:00`);
  const options = { month: "short", day: "numeric" };
  // Check if it has a time component that is not just an ISO string from createdAt
  if (dateString.includes("T") && !dateString.endsWith("Z")) {
    options.hour = "numeric";
    options.minute = "2-digit";
  }
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function toTitleCase(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setLoading(button, loading, label) {
  if (loading) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = label || `<i data-lucide="loader-circle"></i>`;
    refreshIcons();
    return;
  }

  button.disabled = false;
  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
  }
  refreshIcons();
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Notification Engine
function requestNotificationPermission() {
  if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }
}

function checkDeadlines() {
  if (!("Notification" in window) || Notification.permission !== "granted" || !state.user) {
    return;
  }

  const now = Date.now();
  let changed = false;

  state.tasks.forEach((task) => {
    if (task.completed || !task.dueDate) return;

    const dueTime = new Date(task.dueDate).getTime();
    if (isNaN(dueTime)) return;

    const diff = dueTime - now;

    if (diff > 0 && diff <= 600000 && !task.notified10m) {
      new Notification("Task Due Soon!", { body: `10 minutes left to complete: ${task.title}` });
      task.notified10m = true;
      task.notified1h = true;
      task.notified1d = true;
      changed = true;
    } else if (diff > 0 && diff <= 3600000 && !task.notified1h) {
      new Notification("Task Due Soon", { body: `1 hour left to complete: ${task.title}` });
      task.notified1h = true;
      task.notified1d = true;
      changed = true;
    } else if (diff > 0 && diff <= 86400000 && !task.notified1d) {
      new Notification("Deadline Reminder", { body: `1 day left to complete: ${task.title}` });
      task.notified1d = true;
      changed = true;
    }
  });

  if (changed) {
    // Notify DB of changes just to save notification flags
    // (Optional, local state handles it fine as long as they don't refresh)
  }
}

// Check every minute
setInterval(checkDeadlines, 60000);

// --- Supabase DB Helpers ---
async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error fetching tasks:", error);
    showToast("Failed to load tasks");
    return;
  }
  
  state.tasks = data.map(dbToTask);
}

function dbToTask(db) {
  return {
    id: db.id,
    title: db.title,
    notes: db.notes || "",
    category: db.category || "",
    dueDate: db.due_date || "",
    priority: db.priority || "medium",
    aiReason: db.ai_reason || "",
    subtasks: db.subtasks || [],
    completed: db.completed || false,
    completedAt: db.completed_at || null,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

function taskToDb(task, userId) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    notes: task.notes,
    category: task.category,
    due_date: task.dueDate,
    priority: task.priority,
    ai_reason: task.aiReason,
    subtasks: task.subtasks,
    completed: task.completed,
    completed_at: task.completedAt,
    created_at: task.createdAt,
    updated_at: task.updatedAt
  };
}
})();
