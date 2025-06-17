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

export function compile(
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

  const output = (() => {
    try {
      return compileSample(sample, inputData, {
        project: options.project || false,
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error during compilation: ${error.message}`);
      } else {
        console.error("An unknown error occurred during compilation.");
      }
      return null;
    }
  })();

  if (!output) {
    process.exit(1);
  }

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
