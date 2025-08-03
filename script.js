// Task array as single source of truth
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

const taskInput = document.getElementById("taskInput");
const dateInput = document.getElementById("taskDate");

const allList = document.getElementById("allTasksList");
const incompleteList = document.getElementById("incompleteList");
const completedList = document.getElementById("completedList");

// Add a new task
function addTask() {
  const text = taskInput.value.trim();
  const date = dateInput.value;
  if (!text) return;

  const newTask = {
    id: Date.now(),
    text,
    date,
    completed: false
  };

  tasks.push(newTask);
  saveTasks();
  renderTasks();

  taskInput.value = "";
  dateInput.value = "";
}

// Render all lists
function renderTasks() {
  // Clear existing lists
  allList.innerHTML = "";
  incompleteList.innerHTML = "";
  completedList.innerHTML = "";

  tasks.forEach(task => {
    const li = createTaskElement(task);

    // Add to "All Tasks" (clone for display)
    const allLi = createTaskElement(task, true); // display-only
    allList.appendChild(allLi);

    // Add to appropriate list
    if (task.completed) {
      completedList.appendChild(li);
    } else {
      incompleteList.appendChild(li);
    }
  });
}

// Create a task element
function createTaskElement(task, displayOnly = false) {
  const li = document.createElement("li");

  const taskLeft = document.createElement("div");
  taskLeft.className = "task-left";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  if (!displayOnly) {
    checkbox.addEventListener("change", () => toggleTask(task.id));
  }

  const span = document.createElement("span");
  span.className = "task-text";
  span.textContent = task.text;

  const dateSpan = document.createElement("span");
  dateSpan.className = "task-date";
  dateSpan.textContent = task.date ? ` (Due: ${task.date})` : "";

  taskLeft.appendChild(checkbox);
  taskLeft.appendChild(span);
  taskLeft.appendChild(dateSpan);

  li.appendChild(taskLeft);

  if (!displayOnly) {
    const btns = document.createElement("div");
    btns.className = "task-buttons";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "edit";
    editBtn.addEventListener("click", () => editTask(task.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete";
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    btns.appendChild(editBtn);
    btns.appendChild(deleteBtn);
    li.appendChild(btns);
  }

  return li;
}

// Toggle task completion
function toggleTask(id) {
  tasks = tasks.map(task =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
  saveTasks();
  renderTasks();
}

// Edit task
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  const newText = prompt("Edit task:", task.text);
  if (newText) {
    task.text = newText.trim();
    saveTasks();
    renderTasks();
  }
}

// Delete task
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

// Save tasks to localStorage
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Initial render
renderTasks();

// -------------------- DARK MODE --------------------
const toggle = document.getElementById('darkModeToggle');
const body = document.body;

if (localStorage.getItem('theme') === 'dark') {
  body.classList.add('dark-mode');
}

toggle.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
  const theme = body.classList.contains('dark-mode') ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
});



