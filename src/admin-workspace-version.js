// In-flight work belongs to both a document and the version of its inputs.
let documentId = 0;
let version = 0;
export const workspaceVersion = () => version;
export const workspaceDocument = () => documentId;
export function workspaceEdited() { version++; }
export function workspaceReplaced() { documentId++; version++; }

export function allowWorkspaceChange(action) {
  return typeof document.dispatchEvent !== "function" ||
    document.dispatchEvent(new CustomEvent("wedding:before-workspace-change", { cancelable: true, detail: action }));
}
