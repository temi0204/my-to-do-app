document.addEventListener("DOMContentLoaded", () => {
  // ---------- state ----------
  let tasks = [];
  let walletConnected = false;
  let userAddress = "";
  let provider, signer, contract;

  const CONTRACT_ADDRESS = "0x6C45b045591b3daE5842C29FB3B5f41b29Ed8F0c";
  const CONTRACT_ABI = [
    {
      "inputs": [
        { "internalType": "string", "name": "text", "type": "string" },
        { "internalType": "string", "name": "date", "type": "string" }
      ],
      "name": "addTask",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "index", "type": "uint256" }
      ],
      "name": "deleteTask",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "index", "type": "uint256" },
        { "internalType": "string", "name": "newText", "type": "string" },
        { "internalType": "string", "name": "newDate", "type": "string" }
      ],
      "name": "editTask",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
        { "indexed": true, "internalType": "uint256", "name": "index", "type": "uint256" },
        { "indexed": false, "internalType": "string", "name": "text", "type": "string" },
        { "indexed": false, "internalType": "string", "name": "date", "type": "string" }
      ],
      "name": "TaskAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
        { "indexed": true, "internalType": "uint256", "name": "index", "type": "uint256" }
      ],
      "name": "TaskDeleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
        { "indexed": true, "internalType": "uint256", "name": "index", "type": "uint256" },
        { "indexed": false, "internalType": "string", "name": "newText", "type": "string" },
        { "indexed": false, "internalType": "string", "name": "newDate", "type": "string" }
      ],
      "name": "TaskEdited",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
        { "indexed": true, "internalType": "uint256", "name": "index", "type": "uint256" },
        { "indexed": false, "internalType": "bool", "name": "completed", "type": "bool" }
      ],
      "name": "TaskToggled",
      "type": "event"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "index", "type": "uint256" }
      ],
      "name": "toggleTask",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "user", "type": "address" }
      ],
      "name": "getTasks",
      "outputs": [
        {
          "components": [
            { "internalType": "string", "name": "text", "type": "string" },
            { "internalType": "string", "name": "date", "type": "string" },
            { "internalType": "bool", "name": "completed", "type": "bool" },
            { "internalType": "bool", "name": "deleted", "type": "bool" }
          ],
          "internalType": "struct TodoBase.Task[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  // ---------- DOM refs ----------
  const authSection = document.getElementById("authSection");
  const appSection = document.getElementById("appSection");
  const authMessage = document.getElementById("authMessage");

  const signupBtn = document.getElementById("signupBtn");
  const loginBtn = document.getElementById("loginBtn");
  const walletLoginBtn = document.getElementById("walletLoginBtn");
  const logoutBtn = document.querySelector("#appSection button[onclick='logout()']"); // fallback
  const connectWalletBtn = document.getElementById("connectWallet");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const userCountDisplay = document.getElementById("userCountDisplay");

  // ---------- CountAPI (global users) ----------
  async function updateUserCount() {
    try {
      const res = await fetch("https://api.countapi.xyz/hit/mytodoapp/users");
      if (!res.ok) throw new Error("countapi fetch failed");
      const data = await res.json();
      if (userCountDisplay) userCountDisplay.textContent = "Users: " + data.value;
      console.log("CountAPI value:", data.value);
    } catch (err) {
      console.warn("CountAPI error:", err);
      if (userCountDisplay) userCountDisplay.textContent = "Users: error";
    }
  }
  // run it
  updateUserCount();

  // ---------- small status badge ----------
  const statusEl = document.createElement("div");
  statusEl.style.position = "fixed";
  statusEl.style.bottom = "10px";
  statusEl.style.right = "10px";
  statusEl.style.background = "#4caf50";
  statusEl.style.color = "white";
  statusEl.style.padding = "8px 12px";
  statusEl.style.borderRadius = "6px";
  statusEl.style.fontFamily = "sans-serif";
  document.body.appendChild(statusEl);

  if (window.MiniKit && window.MiniKit.MiniApp) {
    statusEl.textContent = "✅ Running in Base";
  } else {
    statusEl.textContent = "🌐 Normal browser mode";
  }

  // ---------- Auth functions ----------
  function showApp() {
    if (authSection) authSection.style.display = "none";
    if (appSection) appSection.style.display = "block";
    loadTasks(); // show that user's tasks
  }

  function showAuth() {
    if (authSection) authSection.style.display = "block";
    if (appSection) appSection.style.display = "none";
  }

  function signup() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    if (!username || !password) {
      if (authMessage) authMessage.textContent = "Enter username and password!";
      return;
    }
    if (localStorage.getItem("user_" + username)) {
      if (authMessage) authMessage.textContent = "User already exists.";
    } else {
      localStorage.setItem("user_" + username, password);
      if (authMessage) authMessage.textContent = "Signup successful! Please login.";
      console.log("New signup:", username);
    }
  }

  function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const storedPassword = localStorage.getItem("user_" + username);
    if (storedPassword && storedPassword === password) {
      localStorage.setItem("loggedInUser", username);
      if (authMessage) authMessage.textContent = "Login successful!";
      console.log("Login:", username);
      // track login globally
      fetch(`https://api.countapi.xyz/hit/mytodoapp/logins_${encodeURIComponent(username)}`).catch(()=>{});
      showApp();
    } else {
      if (authMessage) authMessage.textContent = "Invalid credentials.";
    }
  }

  function logout() {
    localStorage.removeItem("loggedInUser");
    // if user logged in via wallet, also disconnect visual state
    document.getElementById("walletAddress").innerText = "";
    walletConnected = false;
    userAddress = "";
    showAuth();
  }

  // Expose functions globally so inline onclick HTML works
  window.signup = signup;
  window.login = login;
  window.logout = logout;

  // attach listeners if elements exist (preferable)
  if (signupBtn) signupBtn.addEventListener("click", signup);
  if (loginBtn) loginBtn.addEventListener("click", login);
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // ---------- Dark mode ----------
  if (darkModeToggle) {
    if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark-mode");
    darkModeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
    });
  }

  // ---------- Wallet helpers ----------
  async function switchToBase() {
    if (!window.ethereum) {
      alert("Wallet not detected!");
      return false;
    }
    const baseChainId = "0xa"; // 10 in hex (Base mainnet). If you used testnet change accordingly.
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

  async function connectWalletAndLogin() {
    // prefer switch to Base first
    const switched = await switchToBase();
    if (!switched) {
      console.log("User didn't switch to Base or no wallet");
      return;
    }
    if (!window.ethereum) return alert("Install MetaMask or Coinbase Wallet.");
    provider = new ethers.providers.Web3Provider(window.ethereum);
    try {
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();
      userAddress = await signer.getAddress();
      document.getElementById("walletAddress").innerText = `Connected: ${userAddress}`;
      walletConnected = true;
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // treat wallet login as login
      localStorage.setItem("loggedInUser", userAddress);
      // track login
      fetch(`https://api.countapi.xyz/hit/mytodoapp/logins_${encodeURIComponent(userAddress)}`).catch(()=>{});
      // load chain tasks and show app
      await loadTasksFromBase();
      showApp();
      console.log("Wallet connected and logged in:", userAddress);
    } catch (e) {
      console.error("Wallet connection rejected", e);
      alert("Wallet connection rejected.");
    }
  }

  // Expose wallet function globally (so inline onclick works)
  window.connectWallet = connectWalletAndLogin;
  if (walletLoginBtn) walletLoginBtn.addEventListener("click", connectWalletAndLogin);

  // also bind the top-level connectWallet button in appSection (if exists)
  if (connectWalletBtn) connectWalletBtn.addEventListener("click", connectWalletAndLogin);

  // ---------- Task storage helpers ----------
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
    if (walletConnected) {
      // already loaded by wallet login path
      return;
    }
    const key = getUserTaskKey();
    if (!key) {
      // no user logged in — show auth instead
      if (!localStorage.getItem("loggedInUser")) {
        showAuth();
      }
      tasks = [];
      renderTasks();
      return;
    }
    tasks = JSON.parse(localStorage.getItem(key)) || [];
    renderTasks();
  }

  async function loadTasksFromBase() {
    if (!walletConnected || !contract) return;
    try {
      const address = userAddress || await signer.getAddress();
      const chainTasks = await contract.getTasks(address);
      tasks = chainTasks.map(t => ({ text: t.text, date: t.date, completed: t.completed }));
      renderTasks();
    } catch (e) {
      console.error("loadTasksFromBase error", e);
    }
  }

  // ---------- Task UI actions ----------
  if (addTaskBtn) addTaskBtn.addEventListener("click", addTask);
  async function addTask() {
    const textEl = document.getElementById("taskInput");
    const dateEl = document.getElementById("taskDate");
    const text = textEl ? textEl.value.trim() : "";
    const date = dateEl ? dateEl.value : "";
    if (!text) return alert("Enter a task");

    if (walletConnected && contract) {
      try {
        const tx = await contract.addTask(text, date);
        await tx.wait();
        await loadTasksFromBase();
      } catch (e) {
        console.error("addTask onchain failed", e);
        alert("Failed to add task on-chain.");
      }
    } else {
      tasks.push({ text, date, completed: false });
      saveTasks();
      renderTasks();
    }

    if (textEl) textEl.value = "";
    if (dateEl) dateEl.value = "";
  }

  async function toggleTask(index) {
    if (walletConnected && contract) {
      try {
        const tx = await contract.toggleTask(index);
        await tx.wait();
        await loadTasksFromBase();
      } catch (e) {
        console.error("toggleTask onchain error", e);
        alert("Failed to toggle on-chain");
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
      } catch (e) {
        console.error("deleteTask onchain error", e);
        alert("Failed to delete on-chain");
      }
    } else {
      tasks.splice(index, 1);
      saveTasks();
      renderTasks();
    }
  }

  // ---------- render ----------
  function renderTasks() {
    const allList = document.getElementById("allTasksList");
    const incompleteList = document.getElementById("incompleteList");
    const completedList = document.getElementById("completedList");
    if (!allList || !incompleteList || !completedList) return;

    allList.innerHTML = incompleteList.innerHTML = completedList.innerHTML = "";

    tasks.forEach((task, index) => {
      const li = document.createElement("li");
      const left = document.createElement("div");
      left.className = "task-left";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!task.completed;
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

      allList.appendChild(li);

      const liClone = li.cloneNode(true);
      liClone.querySelector(".delete").addEventListener("click", () => deleteTask(index));
      liClone.querySelector("input[type=checkbox]").addEventListener("change", () => toggleTask(index));

      if (task.completed) completedList.appendChild(liClone);
      else incompleteList.appendChild(liClone);
    });
  }

  // ---------- initial behavior ----------
  // If already logged in, show app; otherwise show auth
  if (localStorage.getItem("loggedInUser")) {
    // if logged-in user is a wallet address we try to set walletConnected false (wallet connect will run only if user clicks connect)
    showApp();
  } else {
    showAuth();
  }

  // expose task functions for debugging / inline handlers
  window.addTask = addTask;
  window.toggleTask = toggleTask;
  window.deleteTask = deleteTask;

  console.log("script.js initialized");
});
