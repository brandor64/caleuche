import { parse as parseYaml } from "yaml";
import fs from "fs";
import path from "path";
import { Sample } from "@caleuche/core";

export function parse<T>(filePath: string): T | null {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
      return parseYaml(fileContent) as T;
    }
    return JSON.parse(fileContent) as T;
  } catch (error) {
    return null;
  }
}

export function resolveSampleFile(samplePath: string): string {
  if (isDirectory(samplePath)) {
    return path.join(samplePath, "sample.yaml");
  }
  return samplePath;
}

export function isDirectory(path: string): boolean {
  return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
}

export function createOutputDirectory(outputPath: string) {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
}

export function resolveTemplate(
  samplePath: string,
  sample: Sample,
): string | null {
  try {
    const templatePath = path.join(samplePath, sample.template);
    if (!fs.existsSync(templatePath)) {
      return sample.template;
    }
    return fs.readFileSync(templatePath, "utf-8");
  } catch (error) {
    console.error("Error reading template file.");
    return null;
  }
}

export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isVariantDefinition(
  variant: SampleVariant,
): variant is SampleVariantDefinition {
  return isObject(variant) && !Array.isArray(variant);
}

export function getAbsoluteDirectoryPath(
  filePath: string,
): string {
  return path.dirname(path.resolve(filePath));
}

export function isFile(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
}
