import fs from "fs";
import {
  isVariantDefinition,
  isVariantPath,
  isVariantReference,
  parse,
} from "./utils";
import { compileAndWriteOutput, resolveAndParseSample } from "./common";
import path from "path";

function loadVariantDefinition(
  variant: SampleVariantDefinition | SampleVariantPath,
): SampleVariantDefinition | null {
  if (isVariantDefinition(variant)) {
    return variant;
  } else if (isVariantPath(variant)) {
    const v = parse<SampleVariantDefinition>(variant);
    if (!v) {
      console.error(`Failed to parse variant at path: ${variant}`);
      return null;
    }
    return v;
  }
  return null;
}

function loadVariantDefinitions(
  variants?: Record<string, SampleVariantDefinition | SampleVariantPath>,
): Record<string, SampleVariantDefinition> | null {
  if (!variants) return {};
  const definitions: Record<string, SampleVariantDefinition> = {};
  for (const [key, variant] of Object.entries(variants)) {
    const v = loadVariantDefinition(variant);
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
  variant: SampleVariant,
  variantRegistry: Record<string, SampleVariantDefinition>,
): SampleVariantDefinition | null {
  if (isVariantPath(variant)) {
    const v = parse<SampleVariantDefinition>(variant);
    if (!v) {
      console.error(`Failed to parse variant at path: ${variant}`);
      return null;
    }
    return v;
  } else if (isVariantDefinition(variant)) {
    return variant;
  } else if (isVariantReference(variant)) {
    const v = variantRegistry[variant];
    if (!v) {
      console.error(`Variant reference "${variant}" not found in registry.`);
      return null;
    }
    return v;
  }
  console.error(`Invalid variant type: ${JSON.stringify(variant)}`);
  return null;
}

export function batchCompile(batchFile: string) {
  if (!fs.existsSync(batchFile)) {
    console.error(`Batch file "${batchFile}" does not exist.`);
    process.exit(1);
  }
  if (!fs.lstatSync(batchFile).isFile()) {
    console.error(`"${batchFile}" is not a file.`);
    process.exit(1);
  }
  const bachDefinition = parse<BatchCompileOptions>(batchFile);
  if (!bachDefinition) {
    console.error(`Failed to parse batch file: ${batchFile}`);
    process.exit(1);
  }
  const variants = loadVariantDefinitions(bachDefinition.variants);
  if (!variants) {
    process.exit(1);
  }
  const samples = bachDefinition.samples;
  for (const sampleDefinition of samples) {
    const templatePath = path.join(
      path.dirname(batchFile),
      sampleDefinition.templatePath,
    );
    const sample = resolveAndParseSample(templatePath);
    if (!sample) {
      process.exit(1);
    }

    for (const variant of sampleDefinition.variants) {
      const resolvedVariant = resolveVariantDefinition(variant, variants);
      if (!resolvedVariant) {
        process.exit(1);
      }

      if (
        !compileAndWriteOutput(sample, resolvedVariant.data, variant.output, {
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
