# Caleuche CLI

Caleuche CLI is a command-line tool for compiling code samples and generating project files from templates. It supports multiple languages and flexible sample definitions, including inline templates and external template files.

## Installation

```sh
npm install @caleuche/cli
```

## Usage

```
che compile <sample-directory|sample-file> <data-file> <output-directory> [options]
```

- `<sample-directory|sample-file>`: Path to a directory containing a `sample.yaml` or a direct path to a sample YAML file.
- `<data-file>`: Path to the data file (JSON or YAML).
- `<output-directory>`: Directory where the generated project will be placed.

## running locally

From the dev container, run 

```bash
yarn
```

And then:

```bash
npx che .... # your inputs
```

### Options

- `-p, --project` Generate project file (e.g., csproj, go.mod, etc.)

## Examples

### 1. Sample with Inline Template

**sample.yaml**

```yaml
template: |
  Hello, <%= name %>!
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
che compile ./my-sample ./data.yaml ./output
```

### 2. Sample with Template File Reference

**Directory structure:**

```
my-sample/
  sample.yaml
  main.py.tmpl
```

**sample.yaml**

```yaml
template: main.py.tmpl
type: python
dependencies: []
input:
  - name: name
    type: string
    required: true
```

**main.py.tmpl**

```python
print("Hello, <%= name %>!")
```

**data.yaml**

```yaml
name: Alice
```

**Command:**

```sh
che compile ./my-sample ./data.yaml ./output
```

## Sample and Data File Structure

- **Sample file**: YAML describing the sample, including the template (inline or file reference), language, dependencies, and input fields.

- **Data file**: JSON or YAML with the data to inject into the sample.

## License

MIT
