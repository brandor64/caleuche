#!/usr/bin/env node

import { program } from "commander";
import { compile } from "./compile";
import { batchCompile } from "./batch";
import { version } from "../package.json";

program
  .name("@caleuche/cli")
  .description("Caleuche CLI for compiling samples")
  .version(version);

program
  .command("compile <sample-directory> <data-file> <output-directory>")
  .option("-p, --project", "Generate project file")
  .action(compile);

program.command("batch <batch-file>").action(batchCompile);

program.parse();
