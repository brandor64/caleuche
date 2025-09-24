interface SampleVariantInputDefinition {
  type: "object";
  properties: Record<string, any>;
}

interface SampleVariantInputReference {
  type: "reference";
  value: string;
}

interface SampleVariantInputPath {
  type: "path";
  value: string;
}

type SampleVariantInput =
  | SampleVariantInputDefinition
  | SampleVariantInputReference
  | SampleVariantInputPath;

interface SampleVariantConfig {
  output: string;
  input: SampleVariantInput | string;
  tags?: Record<string, any>;
}

interface SampleDefinition {
  templatePath: string;
  variants: SampleVariantConfig[];
}

interface SampleVariantInputEntry {
  name: string;
  input: SampleVariantInputDefinition | SampleVariantInputPath;
}

interface BatchCompileDescription {
  variants?: SampleVariantInputEntry[];
  samples: SampleDefinition[];
}
