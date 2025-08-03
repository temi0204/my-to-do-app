function addTask() {
  const taskInput = document.getElementById("taskInput");
  const taskText = taskInput.value.trim();
  if (!taskText) return;

  const li = createTaskElement(taskText, false);
  document.getElementById("incompleteList").appendChild(li);
  taskInput.value = "";
}

function createTaskElement(text, isCompleted) {
  const li = document.createElement("li");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = isCompleted;

  const span = document.createElement("span");
  span.className = "task-text";
  span.textContent = text;

  const taskLeft = document.createElement("div");
  taskLeft.className = "task-left";
  taskLeft.appendChild(checkbox);
  taskLeft.appendChild(span);

  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.className = "edit";
  editBtn.onclick = () => {
    const newText = prompt("Edit task:", span.textContent);
    if (newText) span.textContent = newText.trim();
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "delete";
  deleteBtn.onclick = () => {
    li.remove();
  };

  const btns = document.createElement("div");
  btns.className = "task-buttons";
  btns.appendChild(editBtn);
  btns.appendChild(deleteBtn);

  li.appendChild(taskLeft);
  li.appendChild(btns);

  checkbox.addEventListener("change", () => {
    li.remove();
    const targetList = checkbox.checked ? "completedList" : "incompleteList";
    document.getElementById(targetList).appendChild(li);
  });

  return li;
}

// Dark Mode Toggle
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

