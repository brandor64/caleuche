import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import {
  parse,
  resolveSampleFile,
  isDirectory,
  createOutputDirectory,
  resolveTemplate,
  isObject,
} from "../src/utils";
import { Sample } from "@caleuche/core";

function multiline(strings: TemplateStringsArray, ...values: any[]) {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += values[i] + strings[i + 1];
  }

  const lines = result.split("\n");

  if (lines[0].trim() === "") lines.shift();
  if (lines[lines.length - 1].trim() === "") lines.pop();

  const nonEmptyLines = lines.filter((line) => line.trim() !== "");
  if (nonEmptyLines.length === 0) return "";

  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => line.match(/^ */)?.[0].length || 0),
  );

  return lines.map((line) => line.slice(minIndent)).join("\n");
}

describe("utils", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(tmpdir(), "caleuche-cli-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("parse", () => {
    it("should parse valid JSON file", () => {
      const jsonFile = path.join(tempDir, "test.json");
      const testData = { name: "test", value: 42 };
      fs.writeFileSync(jsonFile, JSON.stringify(testData));

      const result = parse(jsonFile);
      expect(result).toEqual(testData);
    });

    it("should parse valid YAML file", () => {
      const yamlFile = path.join(tempDir, "test.yaml");
      const yamlContent = multiline`
        name: test
        value: 42`;
      fs.writeFileSync(yamlFile, yamlContent);

      const result = parse(yamlFile);
      expect(result).toEqual({ name: "test", value: 42 });
    });

    it("should parse valid YML file", () => {
      const ymlFile = path.join(tempDir, "test.yml");
      const ymlContent = multiline`
        name: test
        value: 42`;
      fs.writeFileSync(ymlFile, ymlContent);

      const result = parse(ymlFile);
      expect(result).toEqual({ name: "test", value: 42 });
    });

    it("should return null for invalid JSON", () => {
      const invalidJsonFile = path.join(tempDir, "invalid.json");
      fs.writeFileSync(invalidJsonFile, "{ invalid json }");

      const result = parse(invalidJsonFile);
      expect(result).toBeNull();
    });

    it("should return null for invalid YAML", () => {
      const invalidYamlFile = path.join(tempDir, "invalid.yaml");
      fs.writeFileSync(
        invalidYamlFile,
        multiline`
        invalid: yaml: structure:
          broken
      `,
      );

      const result = parse(invalidYamlFile);
      expect(result).toBeNull();
    });

    it("should return null for non-existent file", () => {
      const nonExistentFile = path.join(tempDir, "nonexistent.json");
      const result = parse(nonExistentFile);
      expect(result).toBeNull();
    });
  });

  describe("resolveSampleFile", () => {
    it("should return the file path if it's a file", () => {
      const filePath = path.join(tempDir, "sample.yaml");
      fs.writeFileSync(filePath, "test content");

      const result = resolveSampleFile(filePath);
      expect(result).toBe(filePath);
    });

    it("should return sample.yaml path if input is a directory", () => {
      const dirPath = path.join(tempDir, "sample-dir");
      fs.mkdirSync(dirPath);

      const result = resolveSampleFile(dirPath);
      expect(result).toBe(path.join(dirPath, "sample.yaml"));
    });

    it("should return the path as-is if it doesn't exist", () => {
      const nonExistentPath = path.join(tempDir, "nonexistent");

      const result = resolveSampleFile(nonExistentPath);
      expect(result).toBe(nonExistentPath);
    });
  });

  describe("isDirectory", () => {
    it("should return true for directories", () => {
      const dirPath = path.join(tempDir, "testdir");
      fs.mkdirSync(dirPath);

      expect(isDirectory(dirPath)).toBe(true);
    });

    it("should return false for files", () => {
      const filePath = path.join(tempDir, "testfile.txt");
      fs.writeFileSync(filePath, "test content");

      expect(isDirectory(filePath)).toBe(false);
    });

    it("should return false for non-existent paths", () => {
      const nonExistentPath = path.join(tempDir, "nonexistent");
      expect(isDirectory(nonExistentPath)).toBe(false);
    });
  });

  describe("createOutputDirectory", () => {
    it("should create directory if it doesn't exist", () => {
      const newDir = path.join(tempDir, "new-output");
      expect(fs.existsSync(newDir)).toBe(false);

      createOutputDirectory(newDir);
      expect(fs.existsSync(newDir)).toBe(true);
      expect(fs.lstatSync(newDir).isDirectory()).toBe(true);
    });

    it("should create nested directories", () => {
      const nestedDir = path.join(tempDir, "nested", "output", "dir");
      expect(fs.existsSync(nestedDir)).toBe(false);

      createOutputDirectory(nestedDir);
      expect(fs.existsSync(nestedDir)).toBe(true);
      expect(fs.lstatSync(nestedDir).isDirectory()).toBe(true);
    });

    it("should not throw if directory already exists", () => {
      const existingDir = path.join(tempDir, "existing");
      fs.mkdirSync(existingDir);

      expect(() => createOutputDirectory(existingDir)).not.toThrow();
    });
  });

  describe("resolveTemplate", () => {
    it("should read template file from sample directory", () => {
      const sampleDir = path.join(tempDir, "sample");
      fs.mkdirSync(sampleDir);

      const templateContent = "Hello, <%= name %>!";
      const templateFile = path.join(sampleDir, "template.txt");
      fs.writeFileSync(templateFile, templateContent);

      const sample: Sample = {
        template: "template.txt",
        type: "javascript",
        dependencies: [],
        input: [],
      };

      const result = resolveTemplate(sampleDir, sample);
      expect(result).toBe(templateContent);
    });

    it("should return template string if file doesn't exist", () => {
      const sampleDir = path.join(tempDir, "sample");
      fs.mkdirSync(sampleDir);

      const sample: Sample = {
        template: "inline template content",
        type: "javascript",
        dependencies: [],
        input: [],
      };

      const result = resolveTemplate(sampleDir, sample);
      expect(result).toBe("inline template content");
    });

    it("should handle template files with various extensions", () => {
      const sampleDir = path.join(tempDir, "sample");
      fs.mkdirSync(sampleDir);

      const templateContent = "function test() { return 'hello'; }";
      const templateFile = path.join(sampleDir, "template.js");
      fs.writeFileSync(templateFile, templateContent);

      const sample: Sample = {
        template: "template.js",
        type: "javascript",
        dependencies: [],
        input: [],
      };

      const result = resolveTemplate(sampleDir, sample);
      expect(result).toBe(templateContent);
    });
  });

  describe("isObject", () => {
    it("should return true for plain objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1, b: 2 })).toBe(true);
      expect(isObject({ nested: { object: true } })).toBe(true);
    });

    it("should return false for arrays", () => {
      expect(isObject([])).toBe(false);
      expect(isObject([1, 2, 3])).toBe(false);
      expect(isObject([{}])).toBe(false);
    });

    it("should return false for null", () => {
      expect(isObject(null)).toBe(false);
    });

    it("should return false for primitives", () => {
      expect(isObject("string")).toBe(false);
      expect(isObject(42)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });

    it("should return false for functions", () => {
      expect(isObject(() => {})).toBe(false);
      expect(isObject(function () {})).toBe(false);
    });
  });
});
