import { clearToken } from "../shared/api.js";

async function loadLayout() {
  const sidebar = await fetch("./components/sidebar.html").then(r => r.text());
  const header = await fetch("./components/header.html").then(r => r.text());
  document.getElementById("sidebar").innerHTML = sidebar;
  document.getElementById("header").innerHTML = header;

  document.querySelectorAll(".menu li").forEach(li => {
    li.addEventListener("click", () => {
      document.querySelectorAll(".menu li").forEach(x => x.classList.remove("active"));
      li.classList.add("active");
      const page = li.dataset.page;
      loadPage(page);
    });
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearToken();
    window.location.href = "./login.html";
  });

  loadPage("dashboard");
}

async function loadPage(page) {
  const html = await fetch(`./pages/${page}.html`).then(r => r.text());
  document.getElementById("content").innerHTML = html;
  const item = document.querySelector(`.menu li[data-page='${page}']`);
  if (item) document.getElementById("pageTitle").innerText = item.innerText;
}

loadLayout();