document.addEventListener("DOMContentLoaded", () => {
  // ---------- state ----------
  let tasks = [];
  let walletConnected = false;
  let userAddress = "";
  let provider, signer, contract;

  const CONTRACT_ADDRESS = "0x6C45b045591b3daE5842C29FB3B5f41b29Ed8F0c";
  const CONTRACT_ABI = [ /* ... your ABI exactly as before ... */ ];

  // ---------- DOM refs ----------
  const authSection = document.getElementById("authSection");
  const appSection = document.getElementById("appSection");
  const authMessage = document.getElementById("authMessage");

  const signupBtn = document.getElementById("signupBtn");
  const loginBtn = document.getElementById("loginBtn");
  const walletLoginBtn = document.getElementById("walletLoginBtn");
  const logoutBtn = document.querySelector("#appSection button[onclick='logout()']");
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
  updateUserCount();

  // ---------- Helper: email validator ----------
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // ---------- Auth functions ----------
  function showApp() {
    if (authSection) authSection.style.display = "none";
    if (appSection) appSection.style.display = "block";
    loadTasks();
  }

  function showAuth() {
    if (authSection) authSection.style.display = "block";
    if (appSection) appSection.style.display = "none";
  }

  function signup() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      if (authMessage) authMessage.textContent = "Enter email and password!";
      showPopup("⚠️ Enter email and password!", "#f44336");
      return;
    }

    if (!isValidEmail(username)) {
      if (authMessage) authMessage.textContent = "Enter a valid email address!";
      showPopup("📧 Invalid email format", "#f44336");
      return;
    }

    if (localStorage.getItem("user_" + username)) {
      if (authMessage) authMessage.textContent = "User already exists.";
      showPopup("❌ User already exists", "#f44336");
    } else {
      localStorage.setItem("user_" + username, password);
      if (authMessage) authMessage.textContent = "Signup successful! Please login.";
      showPopup("✅ Signup Successful!");
      console.log("New signup:", username);
    }
  }

  function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!isValidEmail(username)) {
      if (authMessage) authMessage.textContent = "Enter a valid email address!";
      showPopup("📧 Invalid email format", "#f44336");
      return;
    }

    const storedPassword = localStorage.getItem("user_" + username);
    if (storedPassword && storedPassword === password) {
      localStorage.setItem("loggedInUser", username);
      if (authMessage) authMessage.textContent = "Login successful!";
      showPopup("✅ Login Successful!");
      console.log("Login:", username);
      fetch(`https://api.countapi.xyz/hit/mytodoapp/logins_${encodeURIComponent(username)}`).catch(()=>{});
      showApp();
    } else {
      if (authMessage) authMessage.textContent = "Invalid credentials.";
      showPopup("❌ Invalid Login", "#f44336");
    }
  }

  function logout() {
    localStorage.removeItem("loggedInUser");
    document.getElementById("walletAddress").innerText = "";
    walletConnected = false;
    userAddress = "";
    showAuth();
    showPopup("👋 Logged out", "#2196f3");
  }

  // ---------- Popup helper ----------
  function showPopup(message, color = "#4caf50") {
    const popup = document.getElementById("popup");
    const popupMessage = document.getElementById("popupMessage");
    if (!popup || !popupMessage) return;
    popupMessage.textContent = message;
    popup.style.background = color;
    popup.style.display = "block";
    setTimeout(() => popup.style.display = "none", 3000);
  }

  // expose auth functions
  window.signup = signup;
  window.login = login;
  window.logout = logout;

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
  async function switchToBase() { /* ... unchanged ... */ }

  async function connectWalletAndLogin() {
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
      localStorage.setItem("loggedInUser", userAddress);
      fetch(`https://api.countapi.xyz/hit/mytodoapp/logins_${encodeURIComponent(userAddress)}`).catch(()=>{});
      await loadTasksFromBase();
      showApp();
      showPopup("✅ Wallet Connected & Logged In!");
      console.log("Wallet connected and logged in:", userAddress);
    } catch (e) {
      console.error("Wallet connection rejected", e);
      showPopup("❌ Wallet connection rejected", "#f44336");
    }
  }

  window.connectWallet = connectWalletAndLogin;
  if (walletLoginBtn) walletLoginBtn.addEventListener("click", connectWalletAndLogin);
  if (connectWalletBtn) connectWalletBtn.addEventListener("click", connectWalletAndLogin);

  // ---------- Task storage, UI actions, render ----------
  // (keep your existing task code unchanged)

  // ---------- initial behavior ----------
  if (localStorage.getItem("loggedInUser")) {
    showApp();
  } else {
    showAuth();
  }

  console.log("script.js initialized");
});
