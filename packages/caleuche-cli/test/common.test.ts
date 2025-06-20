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
import { resolveAndParseSample } from "../src/common";
const mockParse = vi.mocked(parse);
const mockResolveSampleFile = vi.mocked(resolveSampleFile);
const mockCreateOutputDirectory = vi.mocked(createOutputDirectory);
const mockResolveTemplate = vi.mocked(resolveTemplate);
const mockIsVariantDefinition = vi.mocked(isVariantDefinition);
const mockIsVariantPath = vi.mocked(isVariantPath);
const mockIsVariantReference = vi.mocked(isVariantReference);

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
      mockFs.existsSync.mockReturnValue(true);
      mockParse.mockReturnValueOnce(null);

      const sample = resolveAndParseSample("sample");
      expect(sample).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to parse sample file: /path/to/sample.yaml",
      );
    });
  });
});
