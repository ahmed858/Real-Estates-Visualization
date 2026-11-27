// Reads the node names of a project's .glb model for the editor (server side).
import { glbNodeNames } from "@/modules/domain";
import { readProjectFile } from "./project-files";

/**
 * Node names of projects/<slug>/<modelPath>, or an empty list when the file
 * cannot be served (missing, outside models/, too large) or is not a valid .glb.
 */
export async function readModelNodeNames(projectsDir: string, slug: string, modelPath: string): Promise<string[]> {
  const file = await readProjectFile(projectsDir, slug, modelPath.split("/"));
  if (!file) return [];
  try {
    return glbNodeNames(file.body);
  } catch {
    return [];
  }
}
