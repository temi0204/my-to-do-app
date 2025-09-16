document.addEventListener("DOMContentLoaded", () => {
  let tasks = [];
  let walletConnected = false;
  let userAddress = "";
  let provider, signer, contract;

  const CONTRACT_ADDRESS = "0x6C45b045591b3daE5842C29FB3B5f41b29Ed8F0c";
  const CONTRACT_ABI = [ /* your ABI here */ ];

  // ==============================
  // AUTH HANDLING
  // ==============================
  function showApp() {
    document.getElementById("authSection").style.display = "none";
    document.getElementById("appSection").style.display = "block";
    loadTasks();
  }

  function signup() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (!username || !password) {
      document.getElementById("authMessage").textContent = "Enter username and password!";
      return;
    }

    if (localStorage.getItem("user_" + username)) {
      document.getElementById("authMessage").textContent = "User already exists.";
    } else {
      localStorage.setItem("user_" + username, password);
      document.getElementById("authMessage").textContent = "Signup successful! Please login.";
    }
  }

  function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const storedPassword = localStorage.getItem("user_" + username);
    if (storedPassword && storedPassword === password) {
      localStorage.setItem("loggedInUser", username);
      document.getElementById("authMessage").textContent = "Login successful!";
      showApp();
    } else {
      document.getElementById("authMessage").textContent = "Invalid credentials.";
    }
  }

  function logout() {
    localStorage.removeItem("loggedInUser");
    document.getElementById("authSection").style.display = "block";
    document.getElementById("appSection").style.display = "none";
    taskList.innerHTML = "";
  }

  // Auto-login if user already logged in
  if (localStorage.getItem("loggedInUser")) {
    showApp();
  }

  // ==============================
  // Dark mode toggle
  // ==============================
  const toggle = document.getElementById("darkModeToggle");
  const body = document.body;
  if (localStorage.getItem("theme") === "dark") body.classList.add("dark-mode");
  toggle.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    localStorage.setItem("theme", body.classList.contains("dark-mode") ? "dark" : "light");
  });

  // ==============================
  // Wallet + Base Connection
  // ==============================
  async function switchToBase() {
    if (!window.ethereum) {
      alert("Wallet not detected!");
      return false;
    }
    const baseChainId = "0xa";
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: baseChainId }],
      });
      return true;
    } catch (err) {
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: baseChainId,
              chainName: "Base Mainnet",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://mainnet.base.org"],
              blockExplorerUrls: ["https://basescan.org"]
            }],
          });
          return true;
        } catch {
          alert("Could not add Base network.");
        }
      }
      return false;
    }
  }

  document.getElementById("connectWallet").addEventListener("click", async () => {
    const switched = await switchToBase();
    if (!switched) return;
    if (!window.ethereum) return alert("Install MetaMask or Coinbase Wallet.");
    provider = new ethers.providers.Web3Provider(window.ethereum);
    try {
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();
      userAddress = await signer.getAddress();
      document.getElementById("walletAddress").innerText = `Connected: ${userAddress}`;
      walletConnected = true;
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      await loadTasksFromBase();

      // Treat wallet connection as login
      localStorage.setItem("loggedInUser", userAddress);
      showApp();
    } catch (e) {
      alert("Wallet connection rejected.");
    }
  });

  // ==============================
  // Tasks (Local + Base)
  // ==============================
  async function loadTasksFromBase() {
    if (!walletConnected || !contract) return;
    try {
      const chainTasks = await contract.getTasks(userAddress);
      tasks = chainTasks.map(t => ({
        text: t.text,
        date: t.date,
        completed: t.completed
      }));
      renderTasks();
    } catch (e) {
      console.error(e);
    }
  }

  function getUserTaskKey() {
    const user = localStorage.getItem("loggedInUser");
    if (!user) return null;
    return "tasks_" + user;
  }

  function saveTasks() {
    if (!walletConnected) {
      const key = getUserTaskKey();
      if (key) localStorage.setItem(key, JSON.stringify(tasks));
    }
  }

  function loadTasks() {
    if (!walletConnected) {
      const key = getUserTaskKey();
      if (key) tasks = JSON.parse(localStorage.getItem(key)) || [];
      renderTasks();
    }
  }

  document.getElementById("addTaskBtn").addEventListener("click", addTask);
  async function addTask() {
    const text = document.getElementById("taskInput").value.trim();
    const date = document.getElementById("taskDate").value;
    if (!text) return;
    if (walletConnected && contract) {
      try {
        const tx = await contract.addTask(text, date);
        await tx.wait();
        await loadTasksFromBase();
      } catch {
        alert("Failed to add task.");
      }
    } else {
      tasks.push({ text, date, completed: false });
      saveTasks();
      renderTasks();
    }
    document.getElementById("taskInput").value = "";
    document.getElementById("taskDate").value = "";
  }

  async function toggleTask(index) {
    if (walletConnected && contract) {
      try {
        const tx = await contract.toggleTask(index);
        await tx.wait();
        await loadTasksFromBase();
      } catch {
        alert("Failed to toggle task.");
      }
    } else {
      tasks[index].completed = !tasks[index].completed;
      saveTasks();
      renderTasks();
    }
  }

  async function deleteTask(index) {
    if (walletConnected && contract) {
      try {
        const tx = await contract.deleteTask(index);
        await tx.wait();
        await loadTasksFromBase();
      } catch {
        alert("Failed to delete task.");
      }
    } else {
      tasks.splice(index, 1);
      saveTasks();
      renderTasks();
    }
  }

  function renderTasks() {
    const allList = document.getElementById("allTasksList");
    const incompleteList = document.getElementById("incompleteList");
    const completedList = document.getElementById("completedList");
    allList.innerHTML = incompleteList.innerHTML = completedList.innerHTML = "";

    tasks.forEach((task, index) => {
      const li = document.createElement("li");
      const left = document.createElement("div");
      left.className = "task-left";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.addEventListener("change", () => toggleTask(index));

      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;

      const dateSpan = document.createElement("span");
      dateSpan.className = "task-date";
      dateSpan.textContent = task.date ? ` (Due: ${task.date})` : "";

      left.append(checkbox, text, dateSpan);

      const buttons = document.createElement("div");
      buttons.className = "task-buttons";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "delete";
      deleteBtn.addEventListener("click", () => deleteTask(index));

      buttons.appendChild(deleteBtn);
      li.append(left, buttons);

      // Append original li to all tasks
      allList.appendChild(li);

      // Clone and reattach delete handler
      const liClone = li.cloneNode(true);
      liClone.querySelector(".delete").addEventListener("click", () => deleteTask(index));
      liClone.querySelector("input[type=checkbox]").addEventListener("change", () => toggleTask(index));

      if (task.completed) {
        completedList.appendChild(liClone);
      } else {
        incompleteList.appendChild(liClone);
      }
    });
  }

  // Initial load (local if no wallet)
  loadTasks();
});

      
