// Setup for the "dom" Vitest project: unmount rendered components after each test.
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
