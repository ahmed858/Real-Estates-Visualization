// `npm run generate:schema`: writes the project.json JSON Schema that the
// project intake skill hands to agents. A test fails when the committed copy is stale.
import { writeFile } from "node:fs/promises";
import { projectConfigJsonSchema } from "@/modules/schema";

/** The exact text of the committed schema file. */
export function projectJsonSchemaText(): string {
  return `${JSON.stringify(projectConfigJsonSchema(), null, 2)}\n`;
}

export async function writeProjectJsonSchema(file: string): Promise<void> {
  await writeFile(file, projectJsonSchemaText());
}
