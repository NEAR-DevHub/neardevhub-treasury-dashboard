import { watch } from "fs";
import { spawn } from "child_process";

let rebuildInProgressPromise;

watch(
  "./src",
  {
    recursive: true,
  },
  async (eventType, filename) => {
    console.log(
      `${eventType} watch-event for file: ${filename}, triggering rebuild...`
    );

    if (rebuildInProgressPromise) {
      await rebuildInProgressPromise;
    }
    rebuildInProgressPromise = new Promise((resolve) => {
      const npmRunBuild = spawn("npm", ["run", "build"], { stdio: "inherit" });
      npmRunBuild.on("close", (code) => {
        console.log(`npm run build process exited with code ${code}`);
        rebuildInProgressPromise = null;
        resolve();
      });
    });
  }
);
