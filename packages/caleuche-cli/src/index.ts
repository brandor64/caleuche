#!/usr/bin/env node

import { Option, program } from "commander";
import { compile } from "./compile";
import { batchCompile } from "./batch";
import { version } from "../package.json";
import { initLogger } from "./logger";

program
  .name("@caleuche/cli")
  .description("Caleuche CLI for compiling samples")
  .version(version);

program
  .command("compile")
  .argument(
    "<sample-path>",
    "Path to the sample file or the directory that containes it.",
  )
  .argument(
    "<data-file>",
    "Path to the input to be used to compile the template.",
  )
  .argument(
    "<output-directory>",
    "Directory where the compiled output will be written.",
  )
  .option(
    "-p, --project",
    "Flag to indicate whether to generate the appropriate project file along with the compiled template.",
  )
  .addOption(
    new Option("-l, --log-level <level>", "Set the log level")
      .choices(["silent", "info", "debug"])
      .default("info")
      .env("CALEUCHE_LOG_LEVEL"),
  )
  .action(initLogger(compile));

program
  .command("batch")
  .argument("<batch-file>", "Path to the batch file")
  .option(
    "-d, --output-dir <outputDir>",
    "Output directory for compiled samples",
  )
  .addOption(
    new Option("-l, --log-level <level>", "Set the log level")
      .choices(["silent", "info", "debug"])
      .default("info")
      .env("CALEUCHE_LOG_LEVEL"),
  )
  .action(initLogger(batchCompile));

program.parse();
