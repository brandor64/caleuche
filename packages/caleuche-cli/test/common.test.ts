import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";

vi.mock("fs");
import fs from "fs";
const mockFs = vi.mocked(fs);

vi.mock("../src/utils");
import { parse, resolveSampleFile, isFile } from "../src/utils";
import { resolveAndParseSample } from "../src/common";
const mockParse = vi.mocked(parse);
const mockResolveSampleFile = vi.mocked(resolveSampleFile);
const mockIsFile = vi.mocked(isFile);

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
});
