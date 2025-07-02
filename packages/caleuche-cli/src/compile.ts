import { isObject, parse } from "./utils";
import { compileAndWriteOutput, resolveAndParseSample } from "./common";
import { logger } from "./logger";

export function compile(
  samplePath: string,
  dataPath: string,
  outputPath: string,
  options: { project?: boolean },
) {
  const sample = resolveAndParseSample(samplePath);
  if (!sample) {
    return process.exit(1);
  }

  const inputData = parse<Record<string, any>>(dataPath);
  if (!inputData || !isObject(inputData)) {
    logger.error(`Failed to parse input data file: ${dataPath}`);
    process.exit(1);
  }

  if (!compileAndWriteOutput(sample, inputData, outputPath, options)) {
    process.exit(1);
  }
}
