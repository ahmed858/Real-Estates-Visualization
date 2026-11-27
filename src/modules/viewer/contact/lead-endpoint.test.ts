import { describe, expect, it } from "vitest";
import { leadEndpoint } from "../index";

describe("leadEndpoint", () => {
  it("posts under /p/<slug> on the site itself", () => {
    expect(leadEndpoint("/p/demo-villa", "demo-villa")).toBe("/p/demo-villa/lead");
    expect(leadEndpoint("/p/demo-villa/ground", "demo-villa")).toBe("/p/demo-villa/lead");
  });

  it("posts to /lead on a client's own domain", () => {
    expect(leadEndpoint("/", "client-towers")).toBe("/lead");
    expect(leadEndpoint("/tower-a", "client-towers")).toBe("/lead");
    expect(leadEndpoint("/p/client-towers-2/x", "client-towers")).toBe("/lead");
  });
});
