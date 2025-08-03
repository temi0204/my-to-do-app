let tasks = [];
let filter = 'all';

function addTask() {
  const input = document.getElementById('taskInput');
  const dueInput = document.getElementById('dueDate');
  const catInput = document.getElementById('category');
  const text = input.value.trim();
  if (!text) return;

  const task = {
    text,
    completed: false,
    due: dueInput.value || null,
    category: catInput.value || '',
    id: Date.now()
  };
  tasks.unshift(task);
  saveTasks();
  renderTasks();
  input.value = ''; dueInput.value = ''; catInput.value = '';
}

function renderTasks() {
  const ul = document.getElementById('taskList');
  ul.innerHTML = '';
  const search = document.getElementById('searchInput').value.toLowerCase();

  tasks
    .filter(t => {
      if (filter === 'completed') return t.completed;
      if (filter === 'incomplete') return !t.completed;
      return true;
    })
    .filter(t => t.text.toLowerCase().includes(search) || (t.category && t.category.toLowerCase().includes(search)))
    .forEach(t => addTaskToDOM(t));
}

function addTaskToDOM(t) {
  const li = document.createElement('li');
  li.draggable = true;
  li.ondragstart = e => e.dataTransfer.setData('text/plain', t.id);
  li.ondragover = e => e.preventDefault();
  li.ondrop = e => {
    const id = +e.dataTransfer.getData('text/plain');
    const from = tasks.findIndex(x => x.id === id);
    const to = tasks.findIndex(x => x.id === t.id);
    tasks.splice(to, 0, tasks.splice(from, 1)[0]);
    saveTasks(); renderTasks();
  };
  if (t.completed) li.classList.add('completed');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = t.completed;
  checkbox.onchange = () => {
    t.completed = checkbox.checked;
    saveTasks(); renderTasks();
  };

  const info = document.createElement('div');
  info.className = 'info';
  const text = document.createElement('span');
  text.textContent = t.text; text.className = 'task-text';
  info.appendChild(text);
  if (t.category) {
    const tag = document.createElement('span');
    tag.textContent = t.category; tag.className = 'tag';
    info.appendChild(tag);
  }
  if (t.due) {
    const due = document.createElement('span');
    due.textContent = 'Due: ' + t.due; info.appendChild(due);
  }

  const edit = document.createElement('button');
  edit.textContent = 'Edit'; edit.className = 'edit-btn';
  edit.onclick = () => {
    const newText = prompt('Edit task:', t.text);
    if (newText !== null) { t.text = newText.trim(); }
    const newDue = prompt('New due date (YYYY-MM-DD):', t.due || '');
    if (newDue !== null) { t.due = newDue.trim() || null; }
    const newCat = prompt('Category:', t.category || '');
    if (newCat !== null) { t.category = newCat.trim(); }
    saveTasks(); renderTasks();
  };

  const more = document.createElement('button');
  more.textContent = '✕';
  more.onclick = () => {
    tasks = tasks.filter(x => x.id !== t.id);
    saveTasks(); renderTasks();
  };

  li.appendChild(checkbox);
  li.appendChild(info);
  li.appendChild(edit);
  li.appendChild(more);
  document.getElementById('taskList').appendChild(li);
}

function setFilter(f) { filter = f; renderTasks(); }

function saveTasks() { localStorage.setItem('tasks', JSON.stringify(tasks)); }

function loadTasks() {
  tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

function loadDarkMode() {
  if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
}

window.onload = () => {
  loadDarkMode();
  loadTasks();
  renderTasks();
};
