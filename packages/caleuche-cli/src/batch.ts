import fs from "fs";
import {
  getAbsoluteDirectoryPath,
  isFile,
  isVariantDefinition,
  parse,
} from "./utils";
import { compileAndWriteOutput, resolveAndParseSample } from "./common";
import path from "path";

function loadVariantDefinition(
  variant: SampleVariantDefinition | SampleVariantPath,
  workingDirectory: string
): SampleVariantDefinition | null {
  if (isVariantDefinition(variant)) {
    return variant;
  } else if (fs.existsSync(path.join(workingDirectory, variant))) {
    const v = parse<SampleVariantDefinition>(path.join(workingDirectory, variant));
    if (!v) {
      console.error(`Failed to parse variant at path: ${variant}`);
      return null;
    }
    return v;
  }
  return null;
}

function loadVariantDefinitions(
  variants: Record<string, SampleVariantDefinition | SampleVariantPath> | undefined,
  workingDirectory: string
): Record<string, SampleVariantDefinition> | null {
  if (!variants) return {};
  const definitions: Record<string, SampleVariantDefinition> = {};
  for (const [key, variant] of Object.entries(variants)) {
    const v = loadVariantDefinition(variant, workingDirectory);
    if (!v) {
      console.error(
        `Failed to load variant definition for key "${key}": ${variant}`,
      );
      return null;
    }
    definitions[key] = v;
  }
  return definitions;
}

function resolveVariantDefinition(
  variant: SampleVariantConfig,
  variantRegistry: Record<string, SampleVariantDefinition>,
  workingDirectory: string
): SampleVariantDefinition | null {
  if (isVariantDefinition(variant.data)) {
    return variant.data;
  }

  if (isFile(path.join(workingDirectory, variant.data))) {
    const v = parse<SampleVariantDefinition>(path.join(workingDirectory, variant.data));
    if (v) {
      return v;
    }
  }


    const v = variantRegistry[variant.data];
    if (v) {
      return v;
    }
    console.error(`Variant "${variant.data}" could not be resolved.`);
    return null
}

export function batchCompile(batchFile: string) {
  if (!isFile(batchFile)) {
    console.error(`Batch file "${batchFile}" does not exist or is not a file.`);
    process.exit(1);
  }
  const workingDirectory = getAbsoluteDirectoryPath(batchFile);
  console.log(`Working directory: ${workingDirectory}`);
  const bachDefinition = parse<BatchCompileOptions>(batchFile);
  if (!bachDefinition) {
    console.error(`Failed to parse batch file: ${batchFile}`);
    process.exit(1);
  }
  const variants = loadVariantDefinitions(bachDefinition.variants, workingDirectory);
  console.log(
    `Loaded ${Object.keys(variants || {}).length} variant definitions from batch file.`,
  );
  if (!variants) {
    process.exit(1);
  }
  const samples = bachDefinition.samples;
  for (const sampleDefinition of samples) {
    console.log(`Processing sample: ${sampleDefinition.templatePath}`);
    const templatePath = path.join(
      workingDirectory,
      sampleDefinition.templatePath,
    );
    const sample = resolveAndParseSample(templatePath);
    if (!sample) {
      process.exit(1);
    }

    for (const variant of sampleDefinition.variants) {
      console.log("Processing variant...");
      const resolvedVariant = resolveVariantDefinition(variant, variants, workingDirectory);
      if (!resolvedVariant) {
        process.exit(1);
      }

      const effectiveOutputPath = path.join(
        workingDirectory,
        variant.output,
      );

      if (
        !compileAndWriteOutput(sample, resolvedVariant, effectiveOutputPath, {
          project: true,
        })
      ) {
        console.error(
          `Sample: ${sampleDefinition.templatePath}, Variant: ${JSON.stringify(variant)}`,
        );
        process.exit(1);
      }
    }
  }
}
