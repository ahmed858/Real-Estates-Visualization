// The editor is an internal tool: it is off unless EDITOR_ENABLED is exactly "true".
export const EDITOR_ENABLED_ENV = "EDITOR_ENABLED";

export function isEditorEnabled(env: Readonly<Record<string, string | undefined>>): boolean {
  return env[EDITOR_ENABLED_ENV] === "true";
}
