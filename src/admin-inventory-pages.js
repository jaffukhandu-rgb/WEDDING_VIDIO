// Apply library search and filters only after all metadata pages arrive.
export async function readInventory(url, field, key, readError) {
  const items = [];
  let cursor = "";
  const seen = new Set();
  do {
    const response = await fetch(url + (cursor ? "?after=" + encodeURIComponent(cursor) : ""), {
      headers: { "X-Admin-Key": key }, cache: "no-store"
    });
    if (!response.ok) throw new Error(await readError(response));
    const page = await response.json();
    if (!Array.isArray(page[field])) throw new Error("Incomplete inventory. Reload the library.");
    items.push(...page[field]);
    cursor = page.nextCursor;
    if (cursor && seen.has(cursor)) throw new Error("Inventory pagination stalled. Reload the library.");
    seen.add(cursor);
  } while (cursor);
  return items;
}
