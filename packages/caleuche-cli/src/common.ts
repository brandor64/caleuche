import { compileSample, Sample } from "@caleuche/core";
import {
  createOutputDirectory,
  parse,
  resolveSampleFile,
  resolveTemplate,
} from "./utils";
import fs from "fs";
import path from "path";

export function resolveAndParseSample(samplePath: string): Sample | null {
  const sampleFilePath = resolveSampleFile(samplePath);
  if (!fs.existsSync(sampleFilePath)) {
    console.error(`Sample file not found: ${sampleFilePath}`);
    return null;
  }
  const sample = parse<Sample>(sampleFilePath);
  if (!sample) {
    console.error(`Failed to parse sample file: ${sampleFilePath}`);
    return null;
  }
  const resolvedTemplate = resolveTemplate(samplePath, sample);
  if (!resolvedTemplate) {
    return null;
  }
  sample.template = resolvedTemplate;
  return sample;
}

export function compileAndWriteOutput(
  sample: Sample,
  input: object,
  outputPath: string,
  options: { project?: boolean },
) {
  const output = (() => {
    try {
      return compileSample(sample, input, {
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
    return false;
  }

  try {
    createOutputDirectory(outputPath);

    for (const { fileName, content } of output.items) {
      const itemOutputPath = path.join(outputPath, fileName);
      fs.writeFileSync(itemOutputPath, content);
    }
  } catch {
    console.error(`Failed to write output to ${outputPath}`);
    return false;
  }
  return true;
}
