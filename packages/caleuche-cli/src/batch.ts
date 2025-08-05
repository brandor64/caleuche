import {
  getAbsoluteDirectoryPath,
  getVariantInputReferenceValue,
  isFile,
  isVariantInputDefinition,
  isVariantInputReference,
  parse,
} from "./utils";
import { compileAndWriteOutput, resolveAndParseSample } from "./common";
import { logger } from "./logger";
import path from "path";

function loadVariantInputDefinition(
  variantInput: SampleVariantInputDefinition | SampleVariantInputPath,
  workingDirectory: string,
): SampleVariantInputDefinition | null {
  if (isVariantInputDefinition(variantInput)) {
    return variantInput;
  } else {
    const absolutePath = path.join(workingDirectory, variantInput.value);
    if (isFile(absolutePath)) {
      const v = parse<SampleVariantInputDefinition>(absolutePath);
      if (!v) {
        logger.error(`Failed to parse variant at path: ${absolutePath}`);
        return null;
      }
      return v;
    } else {
      logger.error(
        `Variant input path "${variantInput.value}" does not exist or is not a file.`,
      );
      return null;
    }
  }
}

function loadVariantDefinitions(
  variants: SampleVariantInputEntry[] | undefined,
  workingDirectory: string,
): Record<string, SampleVariantInputDefinition> | null {
  if (!variants) return {};
  const definitions: Record<string, SampleVariantInputDefinition> = {};
  for (const { name, input } of variants) {
    const v = loadVariantInputDefinition(input, workingDirectory);
    if (!v) {
      logger.error(`Failed to load variant definition for key "${name}"`);
      return null;
    }
    definitions[name] = v;
  }
  return definitions;
}

function resolveVariantDefinition(
  variant: SampleVariantConfig,
  variantRegistry: Record<string, SampleVariantInputDefinition>,
  workingDirectory: string,
): SampleVariantInputDefinition | null {
  if (isVariantInputReference(variant.input)) {
    const ref = getVariantInputReferenceValue(variant.input);
    const v = variantRegistry[ref];
    if (v) {
      return v;
    }
    logger.error(`Variant "${ref}" could not be resolved.`);
    return null;
  } else if (isVariantInputDefinition(variant.input)) {
    return variant.input;
  } else {
    const absolutePath = path.join(workingDirectory, variant.input.value);
    if (isFile(absolutePath)) {
      const v = parse<SampleVariantInputDefinition>(absolutePath);
      if (v) {
        return v;
      }
    }
    logger.error(
      `Variant input path "${variant.input.value}" does not exist or is not a file.`,
    );
    return null;
  }
}

export function batchCompile(
  batchFile: string,
  options: { outputDir?: string },
) {
  if (!isFile(batchFile)) {
    logger.error(`Batch file "${batchFile}" does not exist or is not a file.`);
    process.exit(1);
  }
  const workingDirectory = getAbsoluteDirectoryPath(batchFile);
  logger.info(`Working directory: ${workingDirectory}`);
  const batchDefinition = parse<BatchCompileDescription>(batchFile);
  if (!batchDefinition) {
    logger.error(`Failed to parse batch file: ${batchFile}`);
    process.exit(1);
  }
  const variants = loadVariantDefinitions(
    batchDefinition.variants,
    workingDirectory,
  );
  logger.info(
    `Loaded ${Object.keys(variants || {}).length} variant definitions from batch file.`,
  );
  if (!variants) {
    process.exit(1);
  }
  const samples = batchDefinition.samples;
  for (const sampleDefinition of samples) {
    logger.info(`Processing sample: ${sampleDefinition.templatePath}`);
    const templatePath = path.join(
      workingDirectory,
      sampleDefinition.templatePath,
    );
    const sample = resolveAndParseSample(templatePath);
    if (!sample) {
      process.exit(1);
    }

    for (const variant of sampleDefinition.variants) {
      logger.info("Processing variant...");
      const resolvedVariant = resolveVariantDefinition(
        variant,
        variants,
        workingDirectory,
      );
      if (!resolvedVariant) {
        process.exit(1);
      }

      const effectiveOutputPath = path.join(
        options?.outputDir || workingDirectory,
        variant.output,
      );

      if (
        !compileAndWriteOutput(
          sample,
          resolvedVariant.properties,
          effectiveOutputPath,
          {
            project: true,
          },
        )
      ) {
        logger.error(
          `Sample: ${sampleDefinition.templatePath}, Variant: ${JSON.stringify(variant)}`,
        );
        process.exit(1);
      }
    }
  }
}
