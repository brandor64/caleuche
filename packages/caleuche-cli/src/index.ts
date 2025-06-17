#!/usr/bin/env node

import { program } from "commander";
import { compileSample, Sample } from "@caleuche/core";
import fs from "fs";
import path from "path";
import {
  createOutputDirectory,
  isObject,
  parse,
  resolveSampleFile,
  resolveTemplate,
} from "./utils";

program
  .name("@caleuche/cli")
  .description("Caleuche CLI for compiling samples")
  .version("1.0.0");

function compile(
  samplePath: string,
  dataPath: string,
  outputPath: string,
  options: { project?: boolean },
) {
  const sampleFilePath = resolveSampleFile(samplePath);
  if (!fs.existsSync(sampleFilePath)) {
    console.error(`Sample file not found: ${sampleFilePath}`);
    process.exit(1);
  }

  const sample = parse<Sample>(sampleFilePath);
  if (!sample) {
    console.error(`Failed to parse sample file: ${sampleFilePath}`);
    process.exit(1);
  }
  sample.template = resolveTemplate(samplePath, sample);

  const inputData = parse<Record<string, any>>(dataPath);
  if (!inputData || !isObject(inputData)) {
    console.error(`Failed to parse input data file: ${dataPath}`);
    process.exit(1);
  }

  const output = compileSample(sample, inputData, {
    project: options.project || false,
  });

  if (!isObject(inputData)) {
    console.error("Input data must be an object.");
    process.exit(1);
  }

  createOutputDirectory(outputPath);

  for (const { fileName, content } of output.items) {
    const itemOutputPath = path.join(outputPath, fileName);
    fs.writeFileSync(itemOutputPath, content);
  }
}

program
  .command("compile <sample-directory> <data-file> <output-directory>")
  .option("-p, --project", "Generate project file")
  .action(compile);

program.parse();
