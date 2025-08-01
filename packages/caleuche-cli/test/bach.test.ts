import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

vi.mock("@caleuche/core");
import { compileSample } from "@caleuche/core";
const mockCompileSample = vi.mocked(compileSample);

import { batchCompile } from "../src/batch";
import { Optional } from "../src/utils";
import { multiline } from "./utils.test";

describe("batchCompile", () => {
  let tempDir: Optional<string>;
  let mockExit: any;
  let mockConsoleError: any;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "caleuche-cli-test-"));
    mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true });
    }
    vi.restoreAllMocks();
  });

  function getPath(relative: string): string {
    return path.join(tempDir!, relative);
  }

  it("should exit if batch file does not exist", () => {
    expect(() => {
      batchCompile(getPath("batch.yaml"), {});
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      `Batch file "${getPath("batch.yaml")}" does not exist or is not a file.`,
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if batch file is not a file", () => {
    fs.mkdirSync(getPath("batch.yaml"));
    expect(() => {
      batchCompile("batch.yaml", {});
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Batch file "batch.yaml" does not exist or is not a file.',
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if batch file cannot be parsed", () => {
    const batchFilePath = getPath("batch.yaml");
    const invalidYaml = multiline`
      invalid: yaml: structure:
        broken
    `;
    fs.writeFileSync(batchFilePath, invalidYaml);

    expect(() => {
      batchCompile(batchFilePath, {});
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      `Failed to parse batch file: ${batchFilePath}`,
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if variant definitions cannot be loaded", () => {
    const batchFilePath = getPath("batch.yaml");
    const content = multiline`
      variants:
        - name: foo
          input:
            type: path
            value: badvariant.yaml
    `;
    fs.writeFileSync(batchFilePath, content);

    expect(() => {
      batchCompile(batchFilePath, {});
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      `Failed to load variant definition for key "foo"`,
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if sample file not found", () => {
    const batchFilePath = getPath("batch.yaml");
    const content = multiline`
      samples:
        - templatePath: sample.yaml
          variants: []
          output: out
    `;
    fs.writeFileSync(batchFilePath, content);

    expect(() => {
      batchCompile(batchFilePath, {});
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      `Sample file not found: ${getPath("sample.yaml")}`,
    );

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if sample file cannot be parsed", () => {
    const batchFilePath = getPath("batch.yaml");
    const batchFileContent = multiline`
      variants:
        - name: foo
          input:
            type: object
            properties:
              var: value
      samples:
        - templatePath: sample.yaml
          variants:
            - output: out
              input: foo
    `;
    fs.writeFileSync(batchFilePath, batchFileContent);
    const sampleFilePath = getPath("sample.yaml");
    const invalidSampleContent = multiline`
      some: invalid: yaml
    `;
    fs.writeFileSync(sampleFilePath, invalidSampleContent);

    expect(() => {
      batchCompile(batchFilePath, {});
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      `Failed to parse sample file: ${sampleFilePath}`,
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if variant cannot be resolved", () => {
    const batchFilePath = getPath("batch.yaml");
    const batchFileContent = multiline`
      variants:
        - name: foo
          input:
            type: object
            properties:
              var: value
      samples:
        - templatePath: sample.yaml
          variants:
            - output: out
              input: bar
    `;
    fs.writeFileSync(batchFilePath, batchFileContent);
    const sampleFilePath = getPath("sample.yaml");
    const sampleContent = multiline`
      template: sample.js.template
      type: javascript
      dependencies:
      input:
        - name: var
          type: string
          required: true
    `;
    fs.writeFileSync(sampleFilePath, sampleContent);
    expect(() => {
      batchCompile(batchFilePath, {});
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      `Variant "bar" could not be resolved.`,
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if compilation throws error", () => {
    mockCompileSample.mockImplementation(() => {
      throw new Error("Compilation error");
    });
    const batchFilePath = getPath("batch.yaml");
    const batchFileContent = multiline`
      variants:
        - name: foo
          input:
            type: object
            properties:
              var2: value
      samples:
        - templatePath: sample.yaml
          variants:
            - output: out
              input: foo
    `;
    fs.writeFileSync(batchFilePath, batchFileContent);
    const sampleFilePath = getPath("sample.yaml");
    const sampleContent = multiline`
      template: sample.js.template
      type: javascript
      dependencies:
      input:
        - name: var
          type: string
          required: true
    `;
    fs.writeFileSync(sampleFilePath, sampleContent);
    expect(() => {
      batchCompile(batchFilePath, {});
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenNthCalledWith(
      1,
      "Error during compilation: Compilation error",
    );
    expect(mockConsoleError).toHaveBeenNthCalledWith(
      2,
      'Sample: sample.yaml, Variant: {"output":"out","input":"foo"}',
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should exit if compilation throws unknown error", () => {
    mockCompileSample.mockImplementation(() => {
      throw "Unknown error";
    });
    const batchFilePath = getPath("batch.yaml");
    const batchFileContent = multiline`
      variants:
        - name: foo
          input:
            type: object
            properties:
              var2: value
      samples:
        - templatePath: sample.yaml
          variants:
            - output: out
              input: foo
    `;
    fs.writeFileSync(batchFilePath, batchFileContent);
    const sampleFilePath = getPath("sample.yaml");
    const sampleContent = multiline`
      template: sample.js.template
      type: javascript
      dependencies:
      input:
        - name: var
          type: string
          required: true
    `;
    fs.writeFileSync(sampleFilePath, sampleContent);
    expect(() => {
      batchCompile(getPath("batch.yaml"), {});
    }).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      "An unknown error occurred during compilation.",
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should compile and write output files for each variant", () => {
    mockCompileSample.mockReturnValue({
      items: [
        { fileName: "file1.js", content: "console.log('1');" },
        { fileName: "file2.js", content: "console.log('2');" },
      ],
    });
    const batchFilePath = getPath("batch.yaml");
    const batchFileContent = multiline`
      variants:
        - name: foo
          input:
            type: object
            properties:
              var2: value
      samples:
        - templatePath: sample.yaml
          variants:
            - output: out
              input: foo
    `;
    fs.writeFileSync(batchFilePath, batchFileContent);
    const sampleFilePath = getPath("sample.yaml");
    const sampleContent = multiline`
      template: sample.js.template
      type: javascript
      dependencies:
      input:
        - name: var
          type: string
          required: true
    `;
    fs.writeFileSync(sampleFilePath, sampleContent);
    batchCompile(batchFilePath, {});

    expect(fs.existsSync(getPath("out/file1.js"))).toBe(true);
    expect(fs.readFileSync(getPath("out/file1.js"), "utf-8")).toBe(
      "console.log('1');",
    );
    expect(fs.existsSync(getPath("out/file2.js"))).toBe(true);
    expect(fs.readFileSync(getPath("out/file2.js"), "utf-8")).toBe(
      "console.log('2');",
    );
  });

  it("should compile and write output files for each variant", () => {
    mockCompileSample.mockReturnValue({
      items: [
        { fileName: "file1.js", content: "console.log('1');" },
        { fileName: "file2.js", content: "console.log('2');" },
      ],
    });
    const batchFilePath = getPath("batch.yaml");
    const batchFileContent = multiline`
      variants:
        - name: foo
          input:
            type: object
            properties:
              var2: value
      samples:
        - templatePath: sample.yaml
          variants:
            - output: out
              input: foo
    `;
    fs.writeFileSync(batchFilePath, batchFileContent);
    const sampleFilePath = getPath("sample.yaml");
    const sampleContent = multiline`
      template: sample.js.template
      type: javascript
      dependencies:
      input:
        - name: var
          type: string
          required: true
    `;
    fs.writeFileSync(sampleFilePath, sampleContent);
    batchCompile(batchFilePath, { outputDir: getPath("other") });

    expect(fs.existsSync(getPath("other/out/file1.js"))).toBe(true);
    expect(fs.readFileSync(getPath("other/out/file1.js"), "utf-8")).toBe(
      "console.log('1');",
    );
    expect(fs.existsSync(getPath("other/out/file2.js"))).toBe(true);
    expect(fs.readFileSync(getPath("other/out/file2.js"), "utf-8")).toBe(
      "console.log('2');",
    );
  });
});
