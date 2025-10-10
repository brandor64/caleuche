# Caleuche CLI

Caleuche CLI (`che`) is a command-line tool for generating runnable code samples from templates with dynamic data inputs. It transforms template files written with EJS-style syntax (`<%= %>`) into complete, executable code projects across multiple programming languages.

The CLI supports two main workflows:

1. **Single compilation**: Compile one template with one set of input data
2. **Batch compilation**: Compile multiple templates with different input variants in a single operation

Whether you're creating code examples for documentation, generating starter projects, or producing multiple variations of sample code for different configurations, Caleuche CLI automates the process of turning templates into working code complete with appropriate project files and dependency manifests.

## Installation

```sh
npm install @caleuche/cli
```

## Usage

Caleuche CLI provides two commands: `compile` for single template compilation and `batch` for compiling multiple templates at once.

### Compile Command

Compile a single template with input data and generate output files.

```sh
che compile <sample-path> <data-file> <output-directory> [options]
```

**Arguments:**

- `<sample-path>`: Path to a sample YAML file, or a directory containing a `sample.yaml` file
- `<data-file>`: Path to input data file (JSON or YAML format)
- `<output-directory>`: Directory where the compiled output will be written

**Options:**

- `-p, --project`: Generate language-specific project file (e.g., `package.json`, `requirements.txt`, `go.mod`, `Sample.csproj`, `pom.xml`)

**What gets generated:**

- Main code file with compiled template (e.g., `sample.py`, `sample.js`, `Sample.java`, etc.)
- Project file with dependencies (when `-p` flag is used)
- `tags.yaml` metadata file (if tags are defined in the sample)

### Batch Command

Compile multiple templates with different input variants in a single operation.

```sh
che batch <batch-file> [options]
```

**Arguments:**

- `<batch-file>`: Path to a batch configuration file (YAML or JSON)

**Options:**

- `-d, --output-dir <outputDir>`: Base output directory for all compiled samples (defaults to the batch file's directory)

The batch command is ideal for generating multiple variations of samples, such as producing the same template with development and production configurations, or creating examples across different scenarios.

## Examples

### Example 1: Basic Python Sample with Inline Template

This example shows the simplest use case: a Python template with an inline template string.

**Directory structure:**

```
my-sample/
  sample.yaml
  data.yaml
```

**sample.yaml**

```yaml
template: |
  print("Hello, <%= name %>!")
type: python
dependencies: []
input:
  - name: name
    type: string
    required: true
```

**data.yaml**

```yaml
name: World
```

**Command:**

```sh
che compile ./my-sample ./my-sample/data.yaml ./output
```

**Output:** Creates `./output/sample.py` containing:

```python
print("Hello, World!")
```

### Example 2: JavaScript Sample with External Template File

This example demonstrates using an external template file instead of an inline template.

**Directory structure:**

```
my-sample/
  sample.yaml
  main.js.tmpl
data.yaml
```

**sample.yaml**

```yaml
template: main.js.tmpl
type: javascript
dependencies:
  - name: axios
    version: ^1.6.0
input:
  - name: apiUrl
    type: string
    required: true
  - name: timeout
    type: number
    required: false
    default: 5000
```

**main.js.tmpl**

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: '<%= apiUrl %>',
  timeout: <%= timeout %>
});

async function fetchData() {
  const response = await client.get('/data');
  console.log(response.data);
}

fetchData();
```

**data.yaml**

```yaml
apiUrl: https://api.example.com
timeout: 10000
```

**Command:**

```sh
che compile ./my-sample ./data.yaml ./output --project
```

**Output:** Creates:

- `./output/sample.js` with the compiled template
- `./output/package.json` with axios dependency

### Example 3: C# Sample with Complex Input Types

This example shows how to use object and array input types.

**sample.yaml**

```yaml
template: |
  using System;
  using System.Collections.Generic;

  namespace <%= namespace %>
  {
      class Program
      {
          static void Main(string[] args)
          {
              var config = new Dictionary<string, object>
              {
                  {"host", "<%= config.host %>"},
                  {"port", <%= config.port %>},
                  {"ssl", <%= config.ssl %>}
              };
              
              var features = new List<string> { <% features.forEach((f, i) => { %>"<%= f %>"<% if (i < features.length - 1) { %>, <% } }); %> };
              
              Console.WriteLine($"Application: {config["host"]}:{config["port"]}");
          }
      }
  }
type: csharp
dependencies:
  - name: Newtonsoft.Json
    version: 13.0.3
input:
  - name: namespace
    type: string
    required: true
  - name: config
    type: object
    required: true
  - name: features
    type: array
    itemsType: string
    required: true
```

**data.yaml**

```yaml
namespace: MyApplication
config:
  host: localhost
  port: 8080
  ssl: true
features:
  - authentication
  - logging
  - metrics
```

**Command:**

```sh
che compile ./my-sample ./data.yaml ./output -p
```

**Output:** Creates:

- `./output/Sample.cs` with the compiled C# code
- `./output/Sample.csproj` with Newtonsoft.Json dependency

### Example 4: Batch Compilation with Multiple Variants

This example demonstrates using the batch command to compile one template with different configurations.

**Directory structure:**

```
batch-example/
  sample.yaml
  template.py.tmpl
  batch.yaml
  dev-config.yaml
  prod-config.yaml
```

**sample.yaml**

```yaml
template: template.py.tmpl
type: python
dependencies:
  - name: requests
    version: ^2.31.0
input:
  - name: environment
    type: string
    required: true
  - name: debug
    type: boolean
    required: true
  - name: apiKey
    type: string
    required: true
```

**template.py.tmpl**

```python
import os

ENVIRONMENT = "<%= environment %>"
DEBUG = <%= debug %>
API_KEY = "<%= apiKey %>"

def main():
    print(f"Running in {ENVIRONMENT} mode")
    if DEBUG:
        print("Debug mode enabled")
    # Application logic here

if __name__ == "__main__":
    main()
```

**dev-config.yaml**

```yaml
environment: development
debug: true
apiKey: dev-key-12345
```

**prod-config.yaml**

```yaml
environment: production
debug: false
apiKey: prod-key-67890
```

**batch.yaml**

```yaml
variants:
  - name: dev
    input:
      type: path
      value: dev-config.yaml
  - name: prod
    input:
      type: path
      value: prod-config.yaml

samples:
  - templatePath: ./sample.yaml
    variants:
      - output: ./out-dev/
        input: dev
        tags:
          version: 1.0.0
          environment: development
      - output: ./out-prod/
        input: prod
        tags:
          version: 1.0.0
          environment: production
```

**Command:**

```sh
che batch ./batch-example/batch.yaml -d ./outputs
```

**Output:** Creates:

- `./outputs/out-dev/sample.py` and `./outputs/out-dev/requirements.txt` (dev version)
- `./outputs/out-dev/tags.yaml` with development metadata
- `./outputs/out-prod/sample.py` and `./outputs/out-prod/requirements.txt` (prod version)
- `./outputs/out-prod/tags.yaml` with production metadata

### Example 5: Using Tags for Metadata

Tags allow you to attach custom metadata to your samples for organization and filtering.

**sample.yaml**

```yaml
template: |
  console.log("Sample code");
type: javascript
dependencies: []
input: []
tags:
  category: tutorial
  difficulty: beginner
  language: javascript
  version: 1.0.0
```

**Command:**

```sh
che compile ./sample.yaml ./empty-data.yaml ./output
```

**Output:** Creates:

- `./output/sample.js` with the code
- `./output/tags.yaml` containing the metadata:
  ```yaml
  category: tutorial
  difficulty: beginner
  language: javascript
  version: 1.0.0
  ```

## Sample and Data File Structure

### Sample File Schema

The sample file is a YAML document that describes a code template and its requirements. It can be named anything but is commonly named `sample.yaml`.

**Structure:**

```yaml
template: string | path/to/template.file
type: "csharp" | "go" | "java" | "python" | "javascript"
dependencies:
  - name: string
    version: string
input:
  - name: string
    type: "string" | "number" | "boolean" | "object" | "array"
    required: boolean
    default?: any
    itemsType?: "string" | "number" | "boolean" | "object"  # only for array type
tags?:
  key: value
```

**Fields:**

- **`template`** (required): Either an inline template string (using YAML multiline syntax `|`) or a relative path to a template file. Template files can have any extension (commonly `.tmpl`).

- **`type`** (required): Target programming language. Must be one of:

  - `javascript` - Generates `sample.js` and optionally `package.json`
  - `python` - Generates `sample.py` and optionally `requirements.txt`
  - `csharp` - Generates `Sample.cs` and optionally `Sample.csproj`
  - `java` - Generates `Sample.java` and optionally `pom.xml`
  - `go` - Generates `sample.go` and optionally `go.mod`

- **`dependencies`** (required): Array of package dependencies to include in the generated project file. Each dependency has:

  - `name`: Package/module name
  - `version`: Version string (format depends on the language/package manager)

- **`input`** (required): Array of input field definitions that describe what data the template expects. Each input has:

  - `name`: Variable name used in the template
  - `type`: Data type - can be `string`, `number`, `boolean`, `object`, or `array`
  - `required`: Whether this input must be provided
  - `default`: Optional default value if not provided
  - `itemsType`: (only for `array` type) Type of array elements

- **`tags`** (optional): Key-value pairs for custom metadata. Tags are written to a `tags.yaml` file in the output directory and can be used for categorization, versioning, or filtering samples.

**Template Syntax:**

Templates use EJS-style syntax:

- `<%= expression %>` - Output escaped value
- `<%- expression %>` - Output raw/unescaped value
- `<% statement %>` - Execute JavaScript statement (for loops, conditions, etc.)

### Data File Schema

The data file provides values for the template's input fields. It can be in JSON or YAML format.

**Structure:**

The data file must be an object where keys match the `name` fields defined in the sample's `input` array.

**Example (YAML):**

```yaml
stringField: "some text"
numberField: 42
booleanField: true
objectField:
  key1: value1
  key2: value2
arrayField:
  - item1
  - item2
  - item3
```

**Example (JSON):**

```json
{
  "stringField": "some text",
  "numberField": 42,
  "booleanField": true,
  "objectField": {
    "key1": "value1",
    "key2": "value2"
  },
  "arrayField": ["item1", "item2", "item3"]
}
```

**Validation:**

- All fields marked as `required: true` in the sample must be present in the data file
- Field types in the data must match the types specified in the sample's input definitions
- Missing optional fields will use their default values if defined, or be undefined

### Batch File Schema

The batch file enables compiling multiple templates with different input variants in a single command.

**Structure:**

```yaml
variants:  # (optional) Named input definitions that can be reused
  - name: string
    input:
      type: object
      properties:
        key: value
      # OR
      type: path
      value: path/to/input.yaml

samples:  # (required) List of templates to compile
  - templatePath: path/to/sample/directory/or/file
    variants:
      - output: path/to/output/directory
        input: variant-name  # reference to variants section
        # OR
        input:
          type: object
          properties:
            key: value
        # OR
        input:
          type: path
          value: path/to/input.yaml
        # OR
        input:
          type: reference
          value: variant-name
        tags:  # (optional) Override or add tags for this variant
          key: value
```

**Fields:**

- **`variants`** (optional): Named input definitions that can be referenced by multiple sample variants. Useful for reusing the same configuration across different samples.

- **`samples`** (required): Array of templates to compile. Each sample has:
  - `templatePath`: Path to sample directory or sample YAML file
  - `variants`: Array of compilation variants, each defining:
    - `output`: Output directory path (relative to batch file or `--output-dir`)
    - `input`: Input data, can be:
      - A string (shorthand for reference type)
      - An object with `type: "object"` and `properties`
      - An object with `type: "path"` and `value` pointing to a data file
      - An object with `type: "reference"` and `value` naming a variant
    - `tags`: Optional metadata to add/override for this specific variant

**Input Types:**

- **object**: Inline key-value pairs
- **path**: Reference to external YAML/JSON file
- **reference**: Reference to a named variant from the `variants` section

### Output Structure

After compilation, the output directory will contain:

1. **Main code file**: Named according to the language convention:

   - JavaScript: `sample.js`
   - Python: `sample.py`
   - C#: `Sample.cs`
   - Java: `Sample.java`
   - Go: `sample.go`

2. **Project file** (when `--project` flag is used or in batch mode):

   - JavaScript: `package.json`
   - Python: `requirements.txt`
   - C#: `Sample.csproj`
   - Java: `pom.xml`
   - Go: `go.mod`

3. **Tags file** (when tags are defined): `tags.yaml` containing the metadata

## License

MIT
