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
  isObject,
} from "../src/utils";
const mockParse = vi.mocked(parse);
const mockResolveSampleFile = vi.mocked(resolveSampleFile);
const mockCreateOutputDirectory = vi.mocked(createOutputDirectory);
const mockResolveTemplate = vi.mocked(resolveTemplate);
const mockIsObject = vi.mocked(isObject);

import { compile } from "../src/compile";

describe("compile", () => {
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

  describe("error handling", () => {
    it("should exit when sample file does not exist", () => {
      mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
      mockFs.existsSync.mockReturnValue(false);

      expect(() => {
        compile("sample", "data.json", "output", {});
      }).toThrow("process.exit");

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Sample file not found: /path/to/sample.yaml",
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should exit when sample file cannot be parsed", () => {
      mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
      mockFs.existsSync.mockReturnValue(true);
      mockParse.mockReturnValueOnce(null);

      expect(() => {
        compile("sample", "data.json", "output", {});
      }).toThrow("process.exit");

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to parse sample file: /path/to/sample.yaml",
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should exit when data file cannot be parsed", () => {
      const mockSample: Sample = {
        template: "test template",
        type: "javascript",
        dependencies: [],
        input: [],
      };

      mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
      mockFs.existsSync.mockReturnValue(true);
      mockParse.mockReturnValueOnce(mockSample);
      mockResolveTemplate.mockReturnValue("resolved template");
      mockParse.mockReturnValueOnce(null);

      expect(() => {
        compile("sample", "data.json", "output", {});
      }).toThrow("process.exit");

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to parse input data file: data.json",
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should exit when data is not an object", () => {
      const mockSample: Sample = {
        template: "test template",
        type: "javascript",
        dependencies: [],
        input: [],
      };

      mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
      mockFs.existsSync.mockReturnValue(true);
      mockParse.mockReturnValueOnce(mockSample);
      mockResolveTemplate.mockReturnValue("resolved template");
      mockParse.mockReturnValueOnce("not an object");
      mockIsObject.mockReturnValue(false);

      expect(() => {
        compile("sample", "data.json", "output", {});
      }).toThrow("process.exit");

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to parse input data file: data.json",
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should exit when compilation fails", () => {
      const mockSample: Sample = {
        template: "test template",
        type: "javascript",
        dependencies: [],
        input: [],
      };
      const mockData = { name: "test" };

      mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
      mockFs.existsSync.mockReturnValue(true);
      mockParse.mockReturnValueOnce(mockSample);
      mockResolveTemplate.mockReturnValue("resolved template");
      mockParse.mockReturnValueOnce(mockData);
      mockIsObject.mockReturnValue(true);
      mockCompileSample.mockImplementation(() => {
        throw new Error("Compilation error");
      });

      expect(() => {
        compile("sample", "data.json", "output", {});
      }).toThrow("process.exit");

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error during compilation: Compilation error",
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle unknown compilation errors", () => {
      const mockSample: Sample = {
        template: "test template",
        type: "javascript",
        dependencies: [],
        input: [],
      };
      const mockData = { name: "test" };

      mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
      mockFs.existsSync.mockReturnValue(true);
      mockParse.mockReturnValueOnce(mockSample);
      mockResolveTemplate.mockReturnValue("resolved template");
      mockParse.mockReturnValueOnce(mockData);
      mockIsObject.mockReturnValue(true);
      mockCompileSample.mockImplementation(() => {
        throw "Unknown error";
      });

      expect(() => {
        compile("sample", "data.json", "output", {});
      }).toThrow("process.exit");

      expect(mockConsoleError).toHaveBeenCalledWith(
        "An unknown error occurred during compilation.",
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe("successful compilation", () => {
    it("should compile successfully and write output files", () => {
      const mockSample: Sample = {
        template: "test template",
        type: "javascript",
        dependencies: [],
        input: [],
      };
      const mockData = { name: "test" };
      const mockOutput = {
        items: [
          { fileName: "sample.js", content: "console.log('test');" },
          { fileName: "package.json", content: '{"name": "test"}' },
        ],
      };

      mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
      mockFs.existsSync.mockReturnValue(true);
      mockParse.mockReturnValueOnce(mockSample);
      mockResolveTemplate.mockReturnValue("resolved template");
      mockParse.mockReturnValueOnce(mockData);
      mockIsObject.mockReturnValue(true);
      mockCompileSample.mockReturnValue(mockOutput);
      mockCreateOutputDirectory.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});

      // This should not throw
      compile("sample", "data.json", "output", { project: true });

      expect(mockCreateOutputDirectory).toHaveBeenCalledWith("output");
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join("output", "sample.js"),
        "console.log('test');",
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join("output", "package.json"),
        '{"name": "test"}',
      );
    });

    it("should pass correct options to compileSample", () => {
      const mockSample: Sample = {
        template: "test template",
        type: "javascript",
        dependencies: [],
        input: [],
      };
      const mockData = { name: "test" };
      const mockOutput = {
        items: [{ fileName: "sample.js", content: "console.log('test');" }],
      };

      mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
      mockFs.existsSync.mockReturnValue(true);
      mockParse.mockReturnValueOnce(mockSample);
      mockResolveTemplate.mockReturnValue("resolved template");
      mockParse.mockReturnValueOnce(mockData);
      mockIsObject.mockReturnValue(true);
      mockCompileSample.mockReturnValue(mockOutput);
      mockCreateOutputDirectory.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});

      compile("sample", "data.json", "output", { project: true });

      expect(mockCompileSample).toHaveBeenCalledWith(
        { ...mockSample, template: "resolved template" },
        mockData,
        { project: true },
      );
    });

    it("should default project option to false", () => {
      const mockSample: Sample = {
        template: "test template",
        type: "javascript",
        dependencies: [],
        input: [],
      };
      const mockData = { name: "test" };
      const mockOutput = {
        items: [{ fileName: "sample.js", content: "console.log('test');" }],
      };

      mockResolveSampleFile.mockReturnValue("/path/to/sample.yaml");
      mockFs.existsSync.mockReturnValue(true);
      mockParse.mockReturnValueOnce(mockSample);
      mockResolveTemplate.mockReturnValue("resolved template");
      mockParse.mockReturnValueOnce(mockData);
      mockIsObject.mockReturnValue(true);
      mockCompileSample.mockReturnValue(mockOutput);
      mockCreateOutputDirectory.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});

      compile("sample", "data.json", "output", {});

      expect(mockCompileSample).toHaveBeenCalledWith(
        { ...mockSample, template: "resolved template" },
        mockData,
        { project: false },
      );
    });
  });
});
