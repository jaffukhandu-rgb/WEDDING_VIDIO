// Highlight the current page without modifying navigation destinations.
for (const link of document.querySelectorAll(".admin-sidebar nav a")) {
  const url = new URL(link.href, window.location.href);
  const here = window.location.pathname.split("/").pop() || "admin.html";
  const page = url.pathname.split("/").pop();
  const kindMatches = page !== "admin-templates.html" ||
    url.searchParams.get("kind") === new URLSearchParams(window.location.search).get("kind");
  if (page === here && kindMatches) link.setAttribute("aria-current", "page");
  else link.removeAttribute("aria-current");
}
