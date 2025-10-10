import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import { Sample } from "@caleuche/core";

vi.mock("fs");
import fs from "fs";
const mockFs = vi.mocked(fs);

vi.mock("../src/utils");
import { parse, resolveSampleFile, isFile, createOutputDirectory } from "../src/utils";
import { resolveAndParseSample, compileAndWriteOutput } from "../src/common";
const mockParse = vi.mocked(parse);
const mockResolveSampleFile = vi.mocked(resolveSampleFile);
const mockIsFile = vi.mocked(isFile);
const mockCreateOutputDirectory = vi.mocked(createOutputDirectory);

vi.mock("@caleuche/core");
import { compileSample } from "@caleuche/core";
const mockCompileSample = vi.mocked(compileSample);

describe("common", () => {
  describe("resolveAndParseSample", () => {
    let mockConsoleError: any;

    beforeEach(() => {
      vi.clearAllMocks();
      mockConsoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return null and log an error when sample file does not exist", () => {
      mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
      mockFs.existsSync.mockReturnValue(false);

      const sample = resolveAndParseSample("sample");
      expect(sample).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Sample file not found: /path/to/sample.yaml",
      );
    });

    it("should return null and log an error when sample file cannot be parsed", () => {
      mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
      mockIsFile.mockReturnValue(true);
      mockParse.mockReturnValueOnce(null);

      const sample = resolveAndParseSample("sample");
      expect(sample).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to parse sample file: /path/to/sample.yaml",
      );
    });
  });

  describe("compileAndWriteOutput", () => {
    let mockConsoleError: any;

    beforeEach(() => {
      vi.clearAllMocks();
      mockConsoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should write test files to /test subdirectory when testInput is provided", () => {
      const sample: Sample = {
        template: 'console.log("Hello, <%= name %>!");',
        type: "javascript",
        dependencies: [],
        input: [{ name: "name", type: "string", required: true }],
        testInput: { name: "TestWorld" },
      };
      const input = { name: "World" };
      const outputPath = "/output";

      mockCompileSample.mockReturnValue({
        items: [{ fileName: "sample.js", content: 'console.log("Hello, World!");' }],
        testItems: [{ fileName: "sample.js", content: 'console.log("Hello, TestWorld!");' }],
      });
      mockCreateOutputDirectory.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = compileAndWriteOutput(sample, input, outputPath, { project: false });

      expect(result).toBe(true);
      expect(mockCreateOutputDirectory).toHaveBeenCalledWith("/output");
      expect(mockCreateOutputDirectory).toHaveBeenCalledWith("/output/test");
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join("/output", "sample.js"),
        'console.log("Hello, World!");',
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join("/output/test", "sample.js"),
        'console.log("Hello, TestWorld!");',
      );
    });

    it("should not create /test directory when testItems is not present", () => {
      const sample: Sample = {
        template: 'console.log("Hello, <%= name %>!");',
        type: "javascript",
        dependencies: [],
        input: [{ name: "name", type: "string", required: true }],
      };
      const input = { name: "World" };
      const outputPath = "/output";

      mockCompileSample.mockReturnValue({
        items: [{ fileName: "sample.js", content: 'console.log("Hello, World!");' }],
      });
      mockCreateOutputDirectory.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = compileAndWriteOutput(sample, input, outputPath, { project: false });

      expect(result).toBe(true);
      expect(mockCreateOutputDirectory).toHaveBeenCalledTimes(1);
      expect(mockCreateOutputDirectory).toHaveBeenCalledWith("/output");
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it("should write multiple files to /test directory when project option is enabled", () => {
      const sample: Sample = {
        template: 'console.log("Hello, <%= name %>!");',
        type: "javascript",
        dependencies: [{ name: "express", version: "^4.18.0" }],
        input: [{ name: "name", type: "string", required: true }],
        testInput: { name: "TestWorld" },
      };
      const input = { name: "World" };
      const outputPath = "/output";

      mockCompileSample.mockReturnValue({
        items: [
          { fileName: "sample.js", content: 'console.log("Hello, World!");' },
          { fileName: "package.json", content: '{"name": "sample"}' },
        ],
        testItems: [
          { fileName: "sample.js", content: 'console.log("Hello, TestWorld!");' },
          { fileName: "package.json", content: '{"name": "sample"}' },
        ],
      });
      mockCreateOutputDirectory.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = compileAndWriteOutput(sample, input, outputPath, { project: true });

      expect(result).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(4);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join("/output", "sample.js"),
        'console.log("Hello, World!");',
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join("/output", "package.json"),
        '{"name": "sample"}',
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join("/output/test", "sample.js"),
        'console.log("Hello, TestWorld!");',
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join("/output/test", "package.json"),
        '{"name": "sample"}',
      );
    });
  });
});
