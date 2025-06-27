### Batch Template Compilation

The `batch` command allows you to compile multiple template samples in a single operation, using a configuration file to specify the inputs and outputs.

#### Batch File Schema

The batch input file is a YAML or JSON document with the following structure:

```yaml
variants:                # (optional) List of named input variants
  - name: string         # Name of the variant
    input:               # Input definition (object or path)
      type: object       # or "path"
      properties:        # (if type: object) Key-value pairs for template variables
      # or
      type: path
      value: path/to/input.yaml

samples:                 # List of samples to compile
  - templatePath: path/to/template
    variants:            # List of output variants for this sample
      - output: path/to/output
        input:           # Input for this variant (object, path, or reference)
          type: object   # or "path" or "reference"
          properties:    # (if type: object)
          # or
          type: path
          value: path/to/input.yaml
          # or
          type: reference
          value: variantName
        # Shorthand: if input is a string, it is treated as a reference
        # Example:
        # input: dev
```

#### Input Types

- **object**: Inline key-value pairs for template variables.
- **path**: Reference to an external YAML file with input data.
- **reference**: Refers to a named variant defined in the `variants` section (note that just using input as a string it is equivalent to this)

#### Example

```yaml
variants:
  - name: dev
    input:
      type: object
      properties:
        ENV: development
        DEBUG: true

samples:
  - templatePath: ./project-templates/Sample.csproj.template
    variants:
      - output: ./out/Sample.csproj
        input: dev           # Shorthand for reference
      - output: ./out/Sample.Release.csproj
        input:
          type: object
          properties:
            ENV: production
            DEBUG: false
```
