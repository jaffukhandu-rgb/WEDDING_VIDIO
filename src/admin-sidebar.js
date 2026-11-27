// Highlight the current admin page across the four primary destinations
// while keeping legacy ?kind=video|html bookmarks working cleanly.
for (const link of document.querySelectorAll(".admin-sidebar nav a")) {
  const url = new URL(link.href, window.location.href);
  const here = window.location.pathname.split("/").pop() || "admin.html";
  const page = url.pathname.split("/").pop();
  if (page === here) link.setAttribute("aria-current", "page");
  else link.removeAttribute("aria-current");
}
