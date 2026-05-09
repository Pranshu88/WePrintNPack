import { execSync } from "node:child_process";

function getListenerPids(port) {
  try {
    const output = execSync(`lsof -ti tcp:${port}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });

    return output
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
  } catch {
    return [];
  }
}

const pids = [...new Set(getListenerPids(3000))];

for (const pid of pids) {
  try {
    process.kill(pid, "SIGKILL");
    console.log(`Stopped process ${pid} on port 3000.`);
  } catch {
    // Ignore processes we cannot terminate here.
  }
}
