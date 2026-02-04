// State
let isLoginMode = true;

// Cookie Helpers
function setCookie(name, value, days = 1) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}`;
}
function getCookie(name) {
  return document.cookie.split("; ").reduce((r, v) => {
    const parts = v.split("=");
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, "");
}

function deleteCookie(name) {
  setCookie(name, "", -1);
}

// DOM Elements
const form = document.querySelector("form");
const title = form.querySelector("h1");
const emailInput = form.querySelector('input[type="email"]');
const passwordInput = form.querySelector('input[type="password"]');
const confirmPasswordInput = form.querySelectorAll('input[type="password"]')[1];
const submitBtn = document.querySelector(".submitBtn");
const errorText = document.querySelector(".error");
const options = document.querySelector(".options");
const loginToggle = options.querySelectorAll("div")[0];
const registerToggle = options.querySelectorAll("div")[1];
const authContainer = document.querySelector(".authContainer");

// Init
errorText.style.display = "none";
confirmPasswordInput.parentElement.style.display = "none";

// Mode Toggle Functions
function switchToLogin() {
  isLoginMode = true;
  title.textContent = "Login";
  confirmPasswordInput.parentElement.style.display = "none";
  errorText.style.display = "none";
}

function switchToRegister() {
  isLoginMode = false;
  title.textContent = "Register";
  confirmPasswordInput.parentElement.style.display = "block";
  errorText.style.display = "none";
}

// Event Listeners
loginToggle.addEventListener("click", switchToLogin);
registerToggle.addEventListener("click", switchToRegister);
submitBtn.addEventListener("click", handleSubmit);

// Submit Handler
async function handleSubmit() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  errorText.style.display = "none";

  if (!email || !password) {
    showError("Please fill out all required fields.");
    return;
  }

  if (!isLoginMode && password !== confirmPassword) {
    showError("Passwords do not match.");
    return;
  }

  try {
    const endpoint = isLoginMode ? "login" : "register";
    const response = await fetch(`http://localhost:3000/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || "Something went wrong.");
      return;
    }

    // Save token in cookie
    setCookie("authToken", data.token);

    // Show Todo UI
    showTodoUI();
    await fetchAndDisplayTodos();
  } catch (err) {
    showError("Network error. Try again.");
    console.error(err);
  }
}

// Todo UI Functions
function showTodoUI() {
  authContainer.innerHTML = `
    <h1>Your Todos</h1>
    <button id="logoutBtn">Logout</button>
    <form id="todoForm">
      <input type="text" id="todoTitle" placeholder="Title" required />
      <input type="text" id="todoDesc" placeholder="Description" required />
      <button type="submit">Add Todo</button>
    </form>
    <ul id="todoList"></ul>
  `;

  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("todoForm").addEventListener("submit", createTodo);
}

// Fetch Todos
async function fetchAndDisplayTodos() {
  const token = getCookie("authToken");
  if (!token) return;

  try {
    const res = await fetch("http://localhost:3000/todos", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const todos = await res.json();
    const todoList = document.getElementById("todoList");
    todoList.innerHTML = "";

    todos.forEach((todo) => {
      const li = document.createElement("li");
      li.classList.add("todoItem");

      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.value = todo.title;
      titleInput.disabled = true;

      const descInput = document.createElement("input");
      descInput.type = "text";
      descInput.value = todo.description;
      descInput.disabled = true;

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Save";
      saveBtn.style.display = "none";

      const toggleBtn = document.createElement("button");
      toggleBtn.textContent = todo.completed ? "Mark Pending" : "Mark Done";
      toggleBtn.addEventListener("click", () =>
        toggleComplete(todo.id, !todo.completed),
      );

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

      editBtn.addEventListener("click", () => {
        titleInput.disabled = false;
        descInput.disabled = false;
        titleInput.focus();
        editBtn.style.display = "none";
        saveBtn.style.display = "inline";
      });

      saveBtn.addEventListener("click", async () => {
        await editTodo(todo.id, titleInput.value, descInput.value);
        titleInput.disabled = true;
        descInput.disabled = true;
        editBtn.style.display = "inline";
        saveBtn.style.display = "none";
        await fetchAndDisplayTodos();
      });

      li.appendChild(titleInput);
      li.appendChild(descInput);
      li.appendChild(editBtn);
      li.appendChild(saveBtn);
      li.appendChild(toggleBtn);
      li.appendChild(deleteBtn);
      todoList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

// CRUD Functions
async function createTodo(e) {
  e.preventDefault();
  const token = getCookie("authToken");
  const title = document.getElementById("todoTitle").value.trim();
  const desc = document.getElementById("todoDesc").value.trim();
  if (!title || !desc) return;

  try {
    await fetch("http://localhost:3000/todos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, description: desc }),
    });
    document.getElementById("todoForm").reset();
    await fetchAndDisplayTodos();
  } catch (err) {
    console.error(err);
  }
}

async function editTodo(id, title, description) {
  const token = getCookie("authToken");
  try {
    await fetch(`http://localhost:3000/todos/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, description }),
    });
  } catch (err) {
    console.error(err);
  }
}

async function toggleComplete(id, completed) {
  const token = getCookie("authToken");
  try {
    await fetch(`http://localhost:3000/todos/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ completed }),
    });
    await fetchAndDisplayTodos();
  } catch (err) {
    console.error(err);
  }
}

async function deleteTodo(id) {
  const token = getCookie("authToken");
  try {
    await fetch(`http://localhost:3000/todos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchAndDisplayTodos();
  } catch (err) {
    console.error(err);
  }
}

async function logout() {
  const token = getCookie("authToken");
  try {
    await fetch("http://localhost:3000/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    deleteCookie("authToken");
    location.reload();
  } catch (err) {
    console.error(err);
  }
}
// Helpers
function showError(message) {
  errorText.textContent = message;
  errorText.style.display = "block";
}
// Auto-login if token exists
window.addEventListener("DOMContentLoaded", async () => {
  const token = getCookie("authToken");
  if (token) {
    showTodoUI();
    await fetchAndDisplayTodos();
  }
});
