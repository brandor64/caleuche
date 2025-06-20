import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";

vi.mock("fs");
import fs from "fs";
const mockFs = vi.mocked(fs);

vi.mock("@caleuche/core");
import { compileSample, Sample } from "@caleuche/core";
const mockCompileSample = vi.mocked(compileSample);

vi.mock("../src/utils");
import {
  parse,
  resolveSampleFile,
  createOutputDirectory,
  resolveTemplate,
  isVariantDefinition,
  isVariantPath,
  isVariantReference,
} from "../src/utils";
const mockParse = vi.mocked(parse);
const mockResolveSampleFile = vi.mocked(resolveSampleFile);
const mockCreateOutputDirectory = vi.mocked(createOutputDirectory);
const mockResolveTemplate = vi.mocked(resolveTemplate);
const mockIsVariantDefinition = vi.mocked(isVariantDefinition);
const mockIsVariantPath = vi.mocked(isVariantPath);
const mockIsVariantReference = vi.mocked(isVariantReference);

import { batchCompile } from "../src/batch";

describe("batchCompile", () => {
  let mockExit: any;
  let mockConsoleError: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should exit if batch file does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(() => {
      batchCompile("batch.yaml");
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Batch file "batch.yaml" does not exist.',
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if batch file is not a file", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.lstatSync.mockReturnValue({ isFile: () => false } as any);
    expect(() => {
      batchCompile("batch.yaml");
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      '"batch.yaml" is not a file.',
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if batch file cannot be parsed", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.lstatSync.mockReturnValue({ isFile: () => true } as any);
    mockParse.mockReturnValueOnce(null);
    expect(() => {
      batchCompile("batch.yaml");
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      "Failed to parse batch file: batch.yaml",
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if variant definitions cannot be loaded", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.lstatSync.mockReturnValue({ isFile: () => true } as any);
    mockParse
      .mockImplementationOnce(() => ({
        variants: { foo: "badvariant.yaml" },
        samples: [],
      }))
      .mockImplementationOnce(() => null);
    expect(() => {
      batchCompile("batch.yaml");
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      `Failed to load variant definition for key "foo": badvariant.yaml`,
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if sample file not found", () => {
    mockFs.existsSync.mockReturnValueOnce(true);
    mockFs.lstatSync.mockReturnValue({ isFile: () => true } as any);
    mockParse.mockReturnValueOnce({
      variants: {},
      samples: [{ templatePath: "sample.yaml", variants: [], output: "out" }],
    });
    mockResolveSampleFile.mockReturnValue("sample.yaml");
    mockFs.existsSync.mockReturnValueOnce(false);
    expect(() => {
      batchCompile("batch.yaml");
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      "Sample file not found: sample.yaml",
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if sample file cannot be parsed", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.lstatSync.mockReturnValue({ isFile: () => true } as any);
    mockParse.mockReturnValueOnce({
      variants: {},
      samples: [
        { templatePath: "sample.yaml", variants: ["v1"], output: "out" },
      ],
    });
    mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
    mockParse.mockReturnValueOnce(null);
    expect(() => {
      batchCompile("batch.yaml");
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      "Failed to parse sample file: /path/to/sample.yaml",
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if variant cannot be resolved", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.lstatSync.mockReturnValue({ isFile: () => true } as any);
    mockParse.mockReturnValueOnce({
      variants: {},
      samples: [
        { templatePath: "sample.yaml", variants: ["v1"], output: "out" },
      ],
    });
    mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
    mockParse.mockReturnValueOnce({
      template: "t",
      type: "js",
      dependencies: [],
      input: [],
    });
    mockResolveTemplate.mockReturnValue("resolved template");
    // variant resolution fails
    mockIsVariantPath.mockReturnValue(false);
    mockIsVariantDefinition.mockReturnValue(false);
    mockIsVariantReference.mockReturnValue(false);
    expect(() => {
      batchCompile("batch.yaml");
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith('Invalid variant type: "v1"');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if compilation throws error", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.lstatSync.mockReturnValue({ isFile: () => true } as any);
    mockParse.mockReturnValueOnce({
      variants: {},
      samples: [
        { templatePath: "sample.yaml", variants: ["v1"], output: "out" },
      ],
    });
    mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
    mockParse.mockReturnValueOnce({
      template: "t",
      type: "js",
      dependencies: [],
      input: [],
    });
    mockResolveTemplate.mockReturnValue("resolved template");
    mockIsVariantPath.mockReturnValue(false);
    mockIsVariantDefinition.mockReturnValue(true);
    mockCompileSample.mockImplementation(() => {
      throw new Error("Compilation error");
    });
    expect(() => {
      batchCompile("batch.yaml");
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenNthCalledWith(
      1,
      "Error during compilation: Compilation error",
    );
    expect(mockConsoleError).toHaveBeenNthCalledWith(
      2,
      'Sample: sample.yaml, Variant: "v1"',
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if compilation throws unknown error", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.lstatSync.mockReturnValue({ isFile: () => true } as any);
    mockParse.mockReturnValueOnce({
      variants: {},
      samples: [
        { templatePath: "sample.yaml", variants: ["v1"], output: "out" },
      ],
    });
    mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
    mockParse.mockReturnValueOnce({
      template: "t",
      type: "js",
      dependencies: [],
      input: [],
    });
    mockResolveTemplate.mockReturnValue("resolved template");
    // variant resolution
    mockIsVariantPath.mockReturnValue(false);
    mockIsVariantDefinition.mockReturnValue(true);
    // compileSample throws unknown error
    mockCompileSample.mockImplementation(() => {
      throw "Unknown error";
    });
    expect(() => {
      batchCompile("batch.yaml");
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      "An unknown error occurred during compilation.",
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should compile and write output files for each variant", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.lstatSync.mockReturnValue({ isFile: () => true } as any);
    mockParse.mockReturnValueOnce({
      variants: {},
      samples: [
        {
          templatePath: "sample.yaml",
          variants: [
            { output: "v1.output", foo: "bar" },
            { output: "v2.output", foo: "baz" },
          ],
          output: "out",
        },
      ],
    });
    mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
    mockParse.mockReturnValueOnce({
      template: "t",
      type: "js",
      dependencies: [],
      input: [],
    });
    mockResolveTemplate.mockReturnValue("resolved template");
    // variant resolution
    mockIsVariantPath.mockReturnValue(false);
    mockIsVariantDefinition.mockReturnValue(true);
    // compileSample returns output
    mockCompileSample.mockReturnValue({
      items: [
        { fileName: "file1.js", content: "console.log('1');" },
        { fileName: "file2.js", content: "console.log('2');" },
      ],
    });
    mockCreateOutputDirectory.mockImplementation(() => {});
    mockFs.writeFileSync.mockImplementation(() => {});
    batchCompile("batch.yaml");
    expect(mockCreateOutputDirectory).toHaveBeenCalledWith("v1.output");
    expect(mockCreateOutputDirectory).toHaveBeenCalledWith("v2.output");
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      path.join("v1.output", "file1.js"),
      "console.log('1');",
    );
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      path.join("v1.output", "file2.js"),
      "console.log('2');",
    );
  });
});
