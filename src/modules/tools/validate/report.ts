// The validation report types and formatting live in `domain` so the editor
// shows the same findings; re-exported here for the CLI.
export { errorsOf, formatReport, warningsOf } from "@/modules/domain";
export type { Finding, Severity, ValidationReport } from "@/modules/domain";
