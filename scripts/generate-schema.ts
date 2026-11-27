// Entry for `npm run generate:schema` (run with tsx): rewrites the project intake skill's JSON Schema.
import { join } from "node:path";
import { writeProjectJsonSchema } from "@/modules/tools";

const SCHEMA_FILE = join(process.cwd(), ".claude", "skills", "project-intake", "project.schema.json");

writeProjectJsonSchema(SCHEMA_FILE).then(() => console.log(`Wrote ${SCHEMA_FILE}`));
