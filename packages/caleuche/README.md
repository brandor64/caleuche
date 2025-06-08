# Caleuche Library

This package provides core logic for compiling code samples and generating project files for multiple languages. It is designed to be consumed by the CLI or other tools.

## Features

- Compile code samples for C#, Go, Java, Python, and JavaScript.
- Generate language-specific project files (e.g., `Sample.csproj`, `go.mod`, `pom.xml`, `requirements.txt`, `package.json`).
- Supports template input validation and dependency injection.

## Installation

Install via npm:

```sh
npm install caleuche
```

## Usage

Import the main API in your TypeScript/JavaScript project:

```ts
import { compileSample, Sample, CompileOptions, CompileOutput } from "caleuche";
```

### Example

```ts
const sample: Sample = {
  template: 'console.log("Hello, <%= name %>!");',
  type: "javascript",
  dependencies: [],
  input: [{ name: "name", type: "string", required: true }],
};

const options: CompileOptions = { project: true };

const output: CompileOutput = compileSample(sample, { name: "World" }, options);
// output.items will contain the generated files
```

## API

### Types

- `Language`: `"csharp" | "java" | "python" | "go" | "javascript"`
- `Dependency`: `{ name: string; version: string }`
- `TemplateInput`: Input parameter definition for templates.
- `Sample`: Describes a code sample, its language, dependencies, and inputs.
- `CompileOptions`: `{ project: boolean }`
- `CompileOutput`: `{ items: Array<{ fileName: string; content: string }> }`

### Functions

- `compileSample(sample, input, options): CompileOutput`
  Compiles a code sample and returns generated files.

## License

MIT
