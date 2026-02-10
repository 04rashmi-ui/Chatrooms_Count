/***********************
 * FIREBASE INIT
 ***********************/
const firebaseConfig = {
  apiKey: "AIzaSyA6RyQ1YDC93vQ3d5_4O6lSwPnWS70Vh-o",
  authDomain: "chat-code-123456.firebaseapp.com",
  databaseURL: "https://chat-code-123456-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chat-code-123456",
  storageBucket: "chat-code-123456.firebasestorage.app",
  messagingSenderId: "658498153575",
  appId: "1:658498153575:web:89b758da6251bf5dadf8c2"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

/***********************
 * GLOBAL STATE
 ***********************/
let currentRoom = null;
let manualLoginDone = false;

/***********************
 * AUTH
 ***********************/
auth.onAuthStateChanged(user => {
  if (!user) return;
  if (manualLoginDone && currentRoom) {
    connectRoom(currentRoom);
    listenForReactions(currentRoom);
  }
});

/***********************
 * LOGIN
 ***********************/
window.login = function () {
  const username = loginUsername.value.trim();
  const room = roomChoice.value;
  const password = roomPassword.value;

  if (!username || !room || !password) {
    alert("Fill all fields");
    return;
  }

  const passwords = {
    friends: "friends123",
    family: "family123",
    others: "others123"
  };

  if (password !== passwords[room]) {
    alert("Wrong password");
    return;
  }

  manualLoginDone = true;
  currentRoom = room;
  localStorage.setItem("username", username);

  showAppUI();

  if (!auth.currentUser) {
    auth.signInAnonymously();
  } else {
    connectRoom(currentRoom);
    listenForReactions(currentRoom);
  }
};

function showAppUI() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("reactions").style.display = "flex";
  document.getElementById("reaction-layer").style.display = "block";
}

/***********************
 * CHAT (90-DAY CLEANUP)
 ***********************/
function connectRoom(room) {
  messages.innerHTML = "";

  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - NINETY_DAYS;

  db.ref(`rooms/${room}/messages`)
    .orderByChild("time")
    .endAt(cutoff)
    .once("value", snap => {
      snap.forEach(child => child.ref.remove());
    });

  db.ref(`rooms/${room}/messages`)
    .limitToLast(300)
    .on("child_added", snap => {
      const m = snap.val();
      renderMessage(m.user, m.text, m.uid);
    });
}

window.sendMessage = function () {
  if (!currentRoom) return;
  const text = messageInput.value.trim();
  if (!text) return;

  db.ref(`rooms/${currentRoom}/messages`).push({
    uid: auth.currentUser.uid,
    user: localStorage.getItem("username"),
    text,
    time: Date.now()
  });

  messageInput.value = "";
};

messageInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // prevent newline
    sendMessage();
  }
});


function renderMessage(user, text, uid) {
  const div = document.createElement("div");
  div.className = "message";

  const displayName =
    uid === auth.currentUser?.uid
      ? localStorage.getItem("username")
      : user;

  div.innerHTML = `<strong>${displayName}:</strong> ${text}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

window.clearChat = function () {
  if (!currentRoom) return;

  if (!confirm(`Clear all messages in "${currentRoom}" room?`)) return;

  // Remove messages from Firebase
  db.ref(`rooms/${currentRoom}/messages`).remove()
    .then(() => {
      // Clear UI immediately
      messages.innerHTML = "";
    })
    .catch(err => {
      console.error("Failed to clear chat:", err);
      alert("Failed to clear chat. Try again.");
    });
};



/***********************
 * REAL-TIME REACTIONS (SYNCED)
 ***********************/
window.react = function (emoji) {
  if (!currentRoom) return;

  db.ref(`rooms/${currentRoom}/reactions`).push({
    emoji,
    x: Math.random(),   // percentage
    time: Date.now()
  });
};

function listenForReactions(room) {
  db.ref(`rooms/${room}/reactions`)
    .limitToLast(50)
    .on("child_added", snap => {
      const r = snap.val();
      if (!r) return;

      spawnReaction(r.emoji, r.x);

      // cleanup
      snap.ref.remove();
    });
}

function spawnReaction(emoji, xRatio) {
  const layer = document.getElementById("reaction-layer");
  if (!layer) return;

  const el = document.createElement("div");
  el.className = "floating";
  el.textContent = emoji;
  el.style.left = Math.floor(window.innerWidth * xRatio) + "px";

  layer.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

/***********************
 * COUNTDOWN
 ***********************/
const target = new Date("Jan 1, 2027 00:00:00").getTime();

setInterval(() => {
  const d = target - Date.now();
  glitch.innerText = d <= 0 ? "2027" : "2026";
  days.innerText = Math.max(0, Math.floor(d / 86400000));
  hours.innerText = Math.max(0, Math.floor(d / 3600000) % 24);
  minutes.innerText = Math.max(0, Math.floor(d / 60000) % 60);
  seconds.innerText = Math.max(0, Math.floor(d / 1000) % 60);
}, 1000);

/***********************
 * PARTICLES (VISIBLE)
 ***********************/
const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

const particles = Array.from({ length: 140 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  dx: (Math.random() - 0.5) * 0.7,
  dy: (Math.random() - 0.5) * 0.7,
  r: Math.random() * 2 + 1
}));

function animate() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  particles.forEach(p => {
    p.x += p.dx;
    p.y += p.dy;

    if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(animate);
}
animate();
