import * as core from "@actions/core";
import { run } from "./index.js";

run().catch((err) => {
  core.setFailed(err.message);
});
