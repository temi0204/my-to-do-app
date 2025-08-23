document.addEventListener("DOMContentLoaded", () => {
  let tasks = [];
  let walletConnected = false;
  let userAddress = "";
  let provider, signer, contract;

  const CONTRACT_ADDRESS = "0x6C45b045591b3daE5842C29FB3B5f41b29Ed8F0c";
  const CONTRACT_ABI = [ /* your ABI here exactly as before */ ];
// ==============================
// Global User Counter with CountAPI
// ==============================
async function updateUserCount() {
  try {
    // Call CountAPI (creates a counter if it doesn't exist yet)
    const res = await fetch("https://api.countapi.xyz/hit/mytodoapp/users");
    const data = await res.json();

    // Update UI
    const userCountDisplay = document.getElementById("userCountDisplay");
    if (userCountDisplay) {
      userCountDisplay.textContent = "Users: " + data.value;
    }
  } catch (err) {
    console.error("Error fetching user count:", err);
  }
}

// Run as soon as page loads
document.addEventListener("DOMContentLoaded", updateUserCount);

  // Status badge
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
    const miniApp = new window.MiniKit.MiniApp();
    miniApp.onReady(() => {
      console.log("✅ MiniApp running in Base");
      statusEl.textContent = "✅ Running in Base";
    });
  } else {
    statusEl.textContent = "🌐 Normal browser mode";
  }

  // Dark mode
  const toggle = document.getElementById('darkModeToggle');
  const body = document.body;
  if (localStorage.getItem('theme') === 'dark') body.classList.add('dark-mode');
  toggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
  });

  // Switch to Base
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

  // Connect wallet
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
    } catch (e) {
      alert("Wallet connection rejected.");
    }
  });

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

  function saveTasks() {
    if (!walletConnected) {
      localStorage.setItem("tasks", JSON.stringify(tasks));
    }
  }

  function loadTasks() {
    if (!walletConnected) {
      tasks = JSON.parse(localStorage.getItem("tasks")) || [];
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

  // Load local tasks initially
  loadTasks();
});
document.addEventListener("DOMContentLoaded", async () => {
  const fc = new Farcaster();
  await fc.init();
  console.log("✅ SDK initialized");

  try {
    const user = await fc.getUser();
    console.log("👤 User:", user);
  } catch (err) {
    console.error("Error getting user:", err);
  }
});










