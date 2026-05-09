import { rmSync, existsSync } from "node:fs";

if (existsSync(".next")) {
  rmSync(".next", { recursive: true, force: true });
}
