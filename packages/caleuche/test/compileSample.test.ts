import { describe, it, expect } from "vitest";
import { compileSample, Sample, CompileOptions, CompileOutput } from "../src";

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

describe("compileSample", () => {
  describe("Basic Template Compilation", () => {
    it("should generate a JS file with the correct content", () => {
      const sample: Sample = {
        template: 'console.log("Hello, <%= name %>!");',
        type: "javascript",
        dependencies: [],
        input: [{ name: "name", type: "string", required: true }],
      };
      const options: CompileOptions = { project: true };
      const output: CompileOutput = compileSample(
        sample,
        { name: "World" },
        options,
      );
      expect(output.items.some((item) => item.fileName === "sample.js")).toBe(
        true,
      );
      expect(
        output.items.some((item) =>
          item.content.includes('console.log("Hello, World!");'),
        ),
      ).toBe(true);
    });

    it("should generate correct file names for all supported languages", () => {
      const languages = [
        "javascript",
        "python",
        "csharp",
        "java",
        "go",
      ] as const;
      const expectedFileNames = [
        "sample.js",
        "sample.py",
        "Sample.cs",
        "Sample.java",
        "sample.go",
      ];

      languages.forEach((language, index) => {
        const sample: Sample = {
          template: 'console.log("Hello");',
          type: language,
          dependencies: [],
          input: [],
        };
        const options: CompileOptions = { project: false };
        const output: CompileOutput = compileSample(sample, {}, options);

        expect(output.items[0].fileName).toBe(expectedFileNames[index]);
      });
    });

    it("should preprocess template by removing whitespace before template tags", () => {
      const sample: Sample = {
        template: multiline`
          console.log("Before");
          <% if (true) { %>
          console.log("Inside");
          <% } %>
          console.log("After");
        `,
        type: "javascript",
        dependencies: [],
        input: [],
      };
      const options: CompileOptions = { project: false };
      const output: CompileOutput = compileSample(sample, {}, options);

      const sampleFile = output.items.find(
        (item) => item.fileName === "sample.js",
      );
      expect(sampleFile!.content).toContain(multiline`
          console.log("Before");
          console.log("Inside");
          console.log("After");
      `);
    });
  });

  describe("Input Handling", () => {
    it("should handle optional inputs with default values", () => {
      const sample: Sample = {
        template: 'console.log("Hello, <%= name %>! Port: <%= port %>");',
        type: "javascript",
        dependencies: [],
        input: [
          { name: "name", type: "string", required: true },
          { name: "port", type: "number", required: false, default: 3000 },
        ],
      };
      const options: CompileOptions = { project: false };
      const output: CompileOutput = compileSample(
        sample,
        { name: "World" },
        options,
      );

      const sampleFile = output.items.find(
        (item) => item.fileName === "sample.js",
      );
      expect(sampleFile!.content).toBe(
        'console.log("Hello, World! Port: 3000");',
      );
    });

    it("should override default values when input is provided", () => {
      const sample: Sample = {
        template: 'console.log("Port: <%= port %>");',
        type: "javascript",
        dependencies: [],
        input: [
          { name: "port", type: "number", required: false, default: 3000 },
        ],
      };
      const options: CompileOptions = { project: false };
      const output: CompileOutput = compileSample(
        sample,
        { port: 8080 },
        options,
      );

      const sampleFile = output.items.find(
        (item) => item.fileName === "sample.js",
      );
      expect(sampleFile!.content).toBe('console.log("Port: 8080");');
    });

    it("should handle boolean inputs", () => {
      const sample: Sample = {
        template: 'console.log("Debug mode: <%= debug %>");',
        type: "javascript",
        dependencies: [],
        input: [
          { name: "debug", type: "boolean", required: false, default: false },
        ],
      };
      const options: CompileOptions = { project: false };
      const output: CompileOutput = compileSample(
        sample,
        { debug: true },
        options,
      );

      const sampleFile = output.items.find(
        (item) => item.fileName === "sample.js",
      );
      expect(sampleFile!.content).toBe('console.log("Debug mode: true");');
    });

    it("should handle object inputs", () => {
      const sample: Sample = {
        template:
          'console.log("Config: <%= config.host %>, <%= config.port %>");',
        type: "javascript",
        dependencies: [],
        input: [
          {
            name: "config",
            type: "object",
            required: false,
            default: { host: "localhost", port: 3000 },
          },
        ],
      };
      const options: CompileOptions = { project: false };
      const output: CompileOutput = compileSample(
        sample,
        { config: { host: "example.com", port: 8080 } },
        options,
      );

      const sampleFile = output.items.find(
        (item) => item.fileName === "sample.js",
      );
      expect(sampleFile!.content).toBe(
        'console.log("Config: example.com, 8080");',
      );
    });

    it("should handle multiple required and optional inputs", () => {
      const sample: Sample = {
        template: multiline`
          const config = {
            name: "<%= name %>",
            version: "<%= version %>",
            port: <%= port %>,
            debug: <%= debug %>,
            features: <%= JSON.stringify(features) %>
          };
          console.log(config);`,
        type: "javascript",
        dependencies: [
          { name: "express", version: "^4.18.0" },
          { name: "cors", version: "^2.8.5" },
        ],
        input: [
          { name: "name", type: "string", required: true },
          {
            name: "version",
            type: "string",
            required: false,
            default: "1.0.0",
          },
          { name: "port", type: "number", required: false, default: 3000 },
          { name: "debug", type: "boolean", required: false, default: false },
          {
            name: "features",
            type: "array",
            itemsType: "string",
            required: false,
            default: ["auth", "logging"],
          },
        ],
      };
      const options: CompileOptions = { project: true };
      const output: CompileOutput = compileSample(
        sample,
        {
          name: "MyApp",
          port: 8080,
          debug: true,
          features: ["auth", "logging", "metrics"],
        },
        options,
      );

      expect(output.items).toHaveLength(2);

      const sampleFile = output.items.find(
        (item) => item.fileName === "sample.js",
      );
      expect(sampleFile!.content).toBe(multiline`
          const config = {
            name: "MyApp",
            version: "1.0.0",
            port: 8080,
            debug: true,
            features: ["auth","logging","metrics"]
          };
          console.log(config);
      `);
      const projectFile = output.items.find(
        (item) => item.fileName === "package.json",
      );
      expect(projectFile!.content).toContain('"express": "^4.18.0"');
      expect(projectFile!.content).toContain('"cors": "^2.8.5"');
    });
  });

  describe("Project File Generation", () => {
    it("should generate correct project files for all supported languages", () => {
      const testCases = [
        { language: "javascript" as const, projectFile: "package.json" },
        { language: "python" as const, projectFile: "requirements.txt" },
        { language: "csharp" as const, projectFile: "Sample.csproj" },
        { language: "java" as const, projectFile: "pom.xml" },
        { language: "go" as const, projectFile: "go.mod" },
      ];

      testCases.forEach(({ language, projectFile }) => {
        const sample: Sample = {
          template: 'console.log("Hello");',
          type: language,
          dependencies: [{ name: "test-dep", version: "1.0.0" }],
          input: [],
        };
        const options: CompileOptions = { project: true };
        const output: CompileOutput = compileSample(sample, {}, options);

        expect(output.items.some((item) => item.fileName === projectFile)).toBe(
          true,
        );
        const project = output.items.find(
          (item) => item.fileName === projectFile,
        );
        expect(project!.content).toContain("test-dep");
      });
    });

    it("should handle empty dependencies", () => {
      const sample: Sample = {
        template: 'console.log("No dependencies");',
        type: "javascript",
        dependencies: [],
        input: [],
      };
      const options: CompileOptions = { project: true };
      const output: CompileOutput = compileSample(sample, {}, options);

      const projectFile = output.items.find(
        (item) => item.fileName === "package.json",
      );
      expect(projectFile).toBeDefined();
      expect(projectFile!.content).toContain('"dependencies": {\n  }');
    });

    it("should handle multiple dependencies", () => {
      const sample: Sample = {
        template: 'console.log("Multiple deps");',
        type: "javascript",
        dependencies: [
          { name: "lodash", version: "^4.17.21" },
          { name: "axios", version: "^1.0.0" },
          { name: "express", version: "^4.18.0" },
        ],
        input: [],
      };
      const options: CompileOptions = { project: true };
      const output: CompileOutput = compileSample(sample, {}, options);

      const projectFile = output.items.find(
        (item) => item.fileName === "package.json",
      );
      expect(projectFile).toBeDefined();
      expect(projectFile!.content).toContain('"lodash": "^4.17.21"');
      expect(projectFile!.content).toContain('"axios": "^1.0.0"');
      expect(projectFile!.content).toContain('"express": "^4.18.0"');
    });

    it("should not generate project file when project option is false", () => {
      const sample: Sample = {
        template: 'print("Hello")',
        type: "python",
        dependencies: [{ name: "requests", version: "^2.0.0" }],
        input: [],
      };
      const options: CompileOptions = { project: false };
      const output: CompileOutput = compileSample(sample, {}, options);

      expect(output.items).toHaveLength(1);
      expect(output.items[0].fileName).toBe("sample.py");
      expect(
        output.items.some((item) => item.fileName === "requirements.txt"),
      ).toBe(false);
    });
  });

  describe("Language Helper Functions", () => {
    it("should handle C# helper functions", () => {
      const sample: Sample = {
        template: multiline`
          <%= csharp.usings("System", "System.Net.Http") %>

          class Sample {}
        `,
        type: "csharp",
        dependencies: [],
        input: [],
      };
      const options: CompileOptions = { project: false };
      const output: CompileOutput = compileSample(sample, {}, options);

      const sampleFile = output.items.find(
        (item) => item.fileName === "Sample.cs",
      );
      expect(sampleFile!.content).toBe(multiline`
          using System;
          using System.Net.Http;

          class Sample {}
      `);
    });

    it("should handle complex Go template with helper functions", () => {
      const sample: Sample = {
        template: multiline`
          package main

          <%= go.includes("fmt", "os") %>

          func main() {
          \t<%= go.valueOrEnvironment(true, "apiKey", "API_KEY", "123", 1) %>
          \tfmt.Println("API Key:", apiKey)
          }`,
        type: "go",
        dependencies: [],
        input: [],
      };
      const options: CompileOptions = { project: false };
      const output: CompileOutput = compileSample(sample, {}, options);

      const sampleFile = output.items.find(
        (item) => item.fileName === "sample.go",
      );
      expect(sampleFile!.content).toBe(multiline`
          package main

          import (
          \t"fmt"
          \t"os"
          )

          func main() {
          \tapiKey := os.Getenv("API_KEY")
          \tif len(apiKey) == 0 {
          \t\tfmt.Println("Please set the API_KEY environment variable.")
          \t\tos.Exit(1)
          \t}
          \tfmt.Println("API Key:", apiKey)
          }
          `);
    });

    it("should handle complex Python template with helper functions", () => {
      const sample: Sample = {
        template: multiline`
          import os

          <%= python.valueOrEnvironment(true, "api_key", "API_KEY", "123", 0) %>
          print(f"API Key: {api_key}")`,
        type: "python",
        dependencies: [],
        input: [],
      };
      const options: CompileOptions = { project: false };
      const output: CompileOutput = compileSample(sample, {}, options);

      const sampleFile = output.items.find(
        (item) => item.fileName === "sample.py",
      );
      expect(sampleFile!.content).toBe(multiline`
          import os

          api_key = os.environ.get("API_KEY")
          if not api_key:
            raise ValueError("Please set the API_KEY environment variable.")

          print(f"API Key: {api_key}")
      `);
    });

    it("should handle complex C# template with helper functions", () => {
      const sample: Sample = {
        template: multiline`
          <%= csharp.usings("System", "System.Environment") %>

          class Program
          {
              static void Main()
              {
                  <%= csharp.valueOrEnvironment(true, "apiKey", "API_KEY") %>
                  Console.WriteLine($"API Key: {apiKey}");
              }
          }`,
        type: "csharp",
        dependencies: [],
        input: [],
      };
      const options: CompileOptions = { project: false };
      const output: CompileOutput = compileSample(sample, {}, options);

      const sampleFile = output.items.find(
        (item) => item.fileName === "Sample.cs",
      );
      expect(sampleFile!.content).toBe(multiline`
          using System;
          using System.Environment;

          class Program
          {
              static void Main()
              {
                  var apiKey = Environment.GetEnvironmentVariable("API_KEY") ?? throw new InvalidOperationException("API_KEY environment variable is not set.");
                  Console.WriteLine($"API Key: {apiKey}");
              }
          }`);
    });

    it("should handle complex Javascript template with helper functions", () => {
      const sample: Sample = {
        template: multiline`
          <%= javascript.valueOrEnvironment(true, "api_key", "API_KEY", "123", 0) %>
          console.log("API Key: " + api_key);`,
        type: "javascript",
        dependencies: [],
        input: [],
      };
      const options: CompileOptions = { project: false };
      const output: CompileOutput = compileSample(sample, {}, options);

      const sampleFile = output.items.find(
        (item) => item.fileName === "sample.js",
      );
      expect(sampleFile!.content).toBe(multiline`
          const api_key = process.env["API_KEY"];
          if (!api_key) {
            console.error("Please set the API_KEY environment variable.");
            process.exit(1);
          }
          console.log("API Key: " + api_key);
      `);
    });

    describe("Java template with helper functions", () => {
      const sample: Sample = {
        type: "java",
        input: [
          {
            name: "apiKey",
            type: "string",
            required: false,
            default: "123",
          },
          {
            name: "useEnvVars",
            type: "boolean",
            required: false,
            default: true,
          },
        ],
        template: multiline`
          import java.util.Map;

          public class Sample {
              public static void main(String[] args) {
                  <%= java.valueOrEnvironment(useEnvVars, "apiKey", "API_KEY", apiKey, 2) %>
                  System.out.println("API Key: " + apiKey);
              }
          }`,
        dependencies: [],
      };
      const options: CompileOptions = { project: false };
      it("should compile Java template with environment variable handling", () => {
        const output: CompileOutput = compileSample(
          sample,
          { useEnvVars: true },
          options,
        );
        const sampleFile = output.items.find(
          (item) => item.fileName === "Sample.java",
        );
        expect(sampleFile!.content).toBe(multiline`
            import java.util.Map;

            public class Sample {
                public static void main(String[] args) {
                    String apiKey = System.getenv("API_KEY");
                    if (apiKey == null || apiKey.isEmpty()) {
                        System.out.println("Please set the API_KEY environment variable.");
                        System.exit(1);
                    }
                    System.out.println("API Key: " + apiKey);
                }
            }`);
      });

      it("should compile without environment variable handling", () => {
        const output: CompileOutput = compileSample(
          sample,
          { useEnvVars: false, apiKey: "123" },
          options,
        );
        const sampleFile = output.items.find(
          (item) => item.fileName === "Sample.java",
        );
        expect(sampleFile!.content).toBe(multiline`
            import java.util.Map;

            public class Sample {
                public static void main(String[] args) {
                    String apiKey = "123";
                    System.out.println("API Key: " + apiKey);
                }
            }`);
      });
    });
  });

  describe("Advanced Template Features", () => {
    it("should handle templates with mixed template syntax", () => {
      const sample: Sample = {
        template: multiline`
          <% if (includeHeader) { %>
          console.log("=== <%= title %> ===");
          <% } %>
          const data = <%= JSON.stringify(config) %>;
          <% _.forEach(items, function(item) { %>
          console.log("Item: <%= item %>");
          <% }); %>`,
        type: "javascript",
        dependencies: [],
        input: [
          {
            name: "includeHeader",
            type: "boolean",
            required: false,
            default: true,
          },
          {
            name: "title",
            type: "string",
            required: false,
            default: "Default Title",
          },
          {
            name: "config",
            type: "object",
            required: false,
            default: { env: "dev" },
          },
          {
            name: "items",
            type: "object",
            required: false,
            default: ["item1", "item2"],
          },
        ],
      };
      const options: CompileOptions = { project: false };
      const output: CompileOutput = compileSample(sample, {}, options);

      const sampleFile = output.items.find(
        (item) => item.fileName === "sample.js",
      );
      expect(sampleFile!.content).toBe(multiline`
          console.log("=== Default Title ===");
          const data = {"env":"dev"};
          console.log("Item: item1");
          console.log("Item: item2");

          `);
    });
  });

  describe("Error Handling", () => {
    it("should throw for unsupported language type", () => {
      const sample: Sample = {
        template: 'console.log("Hello");',
        type: "rust" as any,
        dependencies: [],
        input: [],
      };
      const options: CompileOptions = { project: false };
      expect(() => compileSample(sample, {}, options)).toThrow(
        /Unsupported language.*Cannot generate sample file/,
      );
    });

    it("should throw for unsupported language when generating project file", () => {
      const sample: Sample = {
        template: 'console.log("Hello");',
        type: "ruby" as any,
        dependencies: [],
        input: [],
      };
      const options: CompileOptions = { project: true };
      expect(() => compileSample(sample, {}, options)).toThrow(
        /Unsupported language.*Cannot generate project file/,
      );
    });

    it("should throw specific error messages for missing required inputs", () => {
      const sample: Sample = {
        template: 'console.log("Hello, <%= name %>!");',
        type: "javascript",
        dependencies: [],
        input: [{ name: "apiKey", type: "string", required: true }],
      };
      const options: CompileOptions = { project: false };
      expect(() => compileSample(sample, {}, options)).toThrow(
        "Missing required input: apiKey. Please provide a value for this input.",
      );
    });
  });
});
