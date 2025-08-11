document.addEventListener("DOMContentLoaded", () => {
  const miniApp = new window.MiniKit.MiniApp();
  miniApp.onReady(() => {
    console.log("✅ MiniApp is running inside Base!");
  });
});
let tasks = [];
let walletConnected = false;
let userAddress = "";
let provider, signer, contract;

const CONTRACT_ADDRESS = "0x6C45b045591b3daE5842C29FB3B5f41b29Ed8F0c";
const CONTRACT_ABI = [
  [
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "text",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "date",
				"type": "string"
			}
		],
		"name": "addTask",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "deleteTask",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "newText",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "newDate",
				"type": "string"
			}
		],
		"name": "editTask",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "text",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "date",
				"type": "string"
			}
		],
		"name": "TaskAdded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "TaskDeleted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "newText",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "newDate",
				"type": "string"
			}
		],
		"name": "TaskEdited",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "completed",
				"type": "bool"
			}
		],
		"name": "TaskToggled",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "toggleTask",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "getTasks",
		"outputs": [
			{
				"components": [
					{
						"internalType": "string",
						"name": "text",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "date",
						"type": "string"
					},
					{
						"internalType": "bool",
						"name": "completed",
						"type": "bool"
					},
					{
						"internalType": "bool",
						"name": "deleted",
						"type": "bool"
					}
				],
				"internalType": "struct TodoBase.Task[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]
];

// Switch to Base mainnet (chainId 0xa = 10 decimal)
async function switchToBase() {
  if (!window.ethereum) {
    alert("MetaMask or compatible wallet not detected!");
    return false;
  }

  const baseChainId = "0xa"; // Base mainnet chain ID

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: baseChainId }],
    });
    return true;
  } catch (switchError) {
    if (switchError.code === 4902) {
      // Base network not added in wallet, add it
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
      } catch (addError) {
        console.error("Failed to add Base network", addError);
        alert("Failed to add Base network to your wallet.");
        return false;
      }
    }
    console.error("Failed to switch to Base network", switchError);
    alert("Please switch to Base network manually.");
    return false;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById("connectWallet");
  connectBtn.addEventListener("click", async () => {
    const switched = await switchToBase();
    if (!switched) return;

    if (typeof window.ethereum !== "undefined") {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      try {
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        document.getElementById("walletAddress").innerText = `Connected: ${userAddress}`;
        walletConnected = true;
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        await loadTasksFromBase();
      } catch (error) {
        console.error("User rejected wallet connection", error);
        alert("Wallet connection was rejected.");
      }
    } else {
      alert("No wallet found! Please install MetaMask or Coinbase Wallet.");
    }
  });

  loadTasks(); // Load local tasks if wallet not connected
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
  } catch (error) {
    console.error("Error loading tasks from blockchain:", error);
  }
}

function saveTasks() {
  if (walletConnected) {
    console.log("Saving tasks on Base requires smart contract transactions per action.");
  } else {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }
}

function loadTasks() {
  if (!walletConnected) {
    tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    renderTasks();
  }
}

async function addTask() {
  const text = document.getElementById("taskInput").value.trim();
  const date = document.getElementById("taskDate").value;
  if (!text) return;

  if (walletConnected && contract) {
    try {
      const tx = await contract.addTask(text, date);
      await tx.wait();
      await loadTasksFromBase();
    } catch (error) {
      console.error("Failed to add task on blockchain:", error);
      alert("Failed to add task. Check console.");
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
    } catch (error) {
      console.error("Failed to toggle task:", error);
      alert("Failed to toggle task. Check console.");
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
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("Failed to delete task. Check console.");
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

  allList.innerHTML = "";
  incompleteList.innerHTML = "";
  completedList.innerHTML = "";

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

    left.appendChild(checkbox);
    left.appendChild(text);
    left.appendChild(dateSpan);

    const buttons = document.createElement("div");
    buttons.className = "task-buttons";

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete";
    deleteBtn.addEventListener("click", () => deleteTask(index));

    buttons.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(buttons);

    allList.appendChild(li.cloneNode(true));
    if (task.completed) completedList.appendChild(li.cloneNode(true));
    else incompleteList.appendChild(li.cloneNode(true));
  });
}

// Dark mode toggle
const toggle = document.getElementById('darkModeToggle');
const body = document.body;
if (localStorage.getItem('theme') === 'dark') body.classList.add('dark-mode');

toggle.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
  const theme = body.classList.contains('dark-mode') ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
});

