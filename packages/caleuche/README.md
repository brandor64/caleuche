# Caleuche Library

Caleuche is a template-based code generation library that compiles code samples with dynamic inputs into runnable code files across multiple programming languages. It enables you to create reusable code templates using EJS-style syntax (`<%= %>`) and generate complete, executable projects with language-specific project files and dependency manifests.

The library acts as the core engine for tools like the Caleuche CLI, providing a programmatic API for template compilation, input validation, and multi-language code generation. Whether you're building code snippet generators, documentation systems with runnable examples, or developer tools that need to produce working code samples, Caleuche simplifies the process of transforming templates into fully functional code.

## Features

- **Multi-Language Support**: Compile code templates for C#, Go, Java, Python, and JavaScript
- **EJS-Style Templating**: Use familiar `<%= variable %>` syntax with support for JavaScript expressions and control flow
- **Project File Generation**: Automatically generate language-specific project files including dependency manifests:
  - C#: `Sample.csproj`
  - Go: `go.mod`
  - Java: `pom.xml`
  - Python: `requirements.txt`
  - JavaScript: `package.json`
- **Rich Input Types**: Define template inputs with strong typing support:
  - Primitives: `string`, `number`, `boolean`
  - Complex types: `object`, `array` (with typed items)
  - Required/optional fields with default values
- **Template Helper Functions**: Built-in language-specific helpers for common code generation tasks:
  - Import/using statement generation
  - Environment variable handling with runtime validation
- **Metadata Support**: Attach custom tags to samples for categorization and filtering
- **Input Validation**: Automatic validation of required inputs with clear error messages

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

### Basic Example

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
// - sample.js: contains compiled code
// - package.json: contains project metadata and dependencies
```

### Working with Input Types

Caleuche supports various input types with validation and defaults:

```ts
const sample: Sample = {
  template: `
const config = {
  name: "<%= name %>",
  port: <%= port %>,
  debug: <%= debug %>,
  features: <%= JSON.stringify(features) %>
};
  `,
  type: "javascript",
  dependencies: [
    { name: "express", version: "^4.18.0" }
  ],
  input: [
    { name: "name", type: "string", required: true },
    { name: "port", type: "number", required: false, default: 3000 },
    { name: "debug", type: "boolean", required: false, default: false },
    { 
      name: "features", 
      type: "array", 
      itemsType: "string", 
      required: false, 
      default: ["logging"] 
    }
  ]
};

const output = compileSample(sample, { 
  name: "MyApp",
  port: 8080,
  features: ["auth", "logging", "metrics"]
}, { project: true });
```

### Using Template Helpers

Templates can use language-specific helper functions for common tasks:

```ts
// Go sample with import management
const goSample: Sample = {
  template: `
package main

<%- go.includes("fmt", "os", { module: "github.com/joho/godotenv", condition: useEnv }) %>

func main() {
    <%- go.valueOrEnvironment(useEnv, "apiKey", "API_KEY", hardcodedKey) %>
    fmt.Println(apiKey)
}
  `,
  type: "go",
  dependencies: [],
  input: [
    { name: "useEnv", type: "boolean", required: true },
    { name: "hardcodedKey", type: "string", required: false, default: "default-key" }
  ]
};
```

### Adding Metadata with Tags

Attach custom metadata to samples for organization and filtering:

```ts
const sample: Sample = {
  template: 'print("Hello, <%= name %>!")',
  type: "python",
  dependencies: [],
  input: [{ name: "name", type: "string", required: true }],
  tags: {
    category: "basic",
    difficulty: "beginner",
    version: "1.0.0"
  }
};

const output = compileSample(sample, { name: "World" }, { project: false });
// Output includes tags.yaml file with metadata
```

### Template Built-ins

Template helper functions are available within templates to generate language-specific boilerplate code. These functions are accessed via the language namespace (e.g., `go.includes()`, `csharp.usings()`).

#### Universal Helpers

Available for all supported languages:

- **`<language>.valueOrEnvironment(useEnvironmentVariable, variableName, environmentVariable, value, indentationLevel?)`**
  
  Generates code to assign a variable either from an environment variable at runtime (with validation) or from a provided static value.
  
  - `useEnvironmentVariable` (boolean): If true, generates code to read from environment variable
  - `variableName` (string): Name of the variable to create
  - `environmentVariable` (string): Name of the environment variable to read from
  - `value` (string, optional): Static value to use if not reading from environment
  - `indentationLevel` (number, optional): Indentation level for generated code (default varies by language)
  
  **Example:**
  ```ts
  // In a Go template:
  <%- go.valueOrEnvironment(true, "apiKey", "API_KEY") %>
  // Generates:
  // apiKey := os.Getenv("API_KEY")
  // if len(apiKey) == 0 {
  //     fmt.Println("Please set the API_KEY environment variable.")
  //     os.Exit(1)
  // }
  ```

#### Language-Specific Helpers

**Go**

- **`go.includes(...items)`**
  
  Generates Go import statements with automatic grouping (standard library vs. external packages).
  
  - `items`: Rest parameter accepting strings or objects with `{ module: string, condition?: boolean }`
  
  **Example:**
  ```ts
  <%- go.includes("fmt", "os", { module: "github.com/joho/godotenv", condition: needsDotenv }) %>
  // Generates:
  // import (
  //     "fmt"
  //     "os"
  //     
  //     "github.com/joho/godotenv"
  // )
  ```

**C#**

- **`csharp.usings(...items)`**
  
  Generates C# using statements.
  
  - `items`: Rest parameter accepting strings or objects with `{ namespace: string, condition?: boolean }`
  
  **Example:**
  ```ts
  <%- csharp.usings("System", "System.IO", { namespace: "System.Net.Http", condition: needsHttp }) %>
  // Generates:
  // using System;
  // using System.IO;
  // using System.Net.Http;
  ```

**Java, Python, JavaScript**

These languages have the `valueOrEnvironment` helper available but no additional language-specific helpers at this time.

## API

### Types

**`Language`**
```ts
type Language = "csharp" | "java" | "python" | "go" | "javascript"
```

**`Dependency`**
```ts
interface Dependency {
  name: string;
  version: string;
}
```

**`TemplateInput`**

Defines an input parameter for a template. Supports multiple types:

```ts
type TemplateInput =
  | {
      name: string;
      type: "string";
      required: boolean;
      default?: string;
    }
  | {
      name: string;
      type: "number";
      required: boolean;
      default?: number;
    }
  | {
      name: string;
      type: "boolean";
      required: boolean;
      default?: boolean;
    }
  | {
      name: string;
      type: "object";
      required: boolean;
      default?: Record<string, any>;
    }
  | {
      name: string;
      type: "array";
      itemsType: "string" | "number" | "boolean" | "object";
      required: boolean;
      default?: Array<string | number | boolean | Record<string, any>>;
    };
```

**`Sample`**

Describes a code sample with its template, language, dependencies, inputs, and optional metadata:

```ts
interface Sample {
  template: string;              // EJS-style template string
  type: Language;                // Target language
  dependencies: Dependency[];    // Package dependencies
  input: TemplateInput[];        // Template input definitions
  tags?: Record<string, any>;    // Optional metadata tags
}
```

**`CompileOptions`**
```ts
interface CompileOptions {
  project: boolean;  // If true, generates language-specific project file
}
```

**`CompileOutput`**
```ts
interface CompileOutput {
  items: Array<{
    fileName: string;  // Generated file name
    content: string;   // File content
  }>;
}
```

### Functions

**`compileSample(sample: Sample, input: Record<string, any>, options: CompileOptions): CompileOutput`**

Compiles a code sample template with provided input data and returns generated files.

- **`sample`**: Sample definition including template, language, dependencies, and input schema
- **`input`**: Object containing values for template variables (must satisfy required inputs)
- **`options`**: Compilation options (e.g., whether to generate project files)
- **Returns**: Object containing array of generated files with names and content

**Example:**
```ts
const output = compileSample(
  {
    template: 'console.log("<%= message %>");',
    type: "javascript",
    dependencies: [],
    input: [{ name: "message", type: "string", required: true }]
  },
  { message: "Hello World" },
  { project: false }
);

// output.items[0].fileName === "sample.js"
// output.items[0].content === 'console.log("Hello World");'
```

## License

MIT
