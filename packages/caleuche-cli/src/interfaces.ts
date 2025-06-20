type SampleVariantDefinition = Record<string, any>;
type SampleVariantReference = string;
type SampleVariantPath = string;
type SampleVariant =
  | SampleVariantDefinition
  | SampleVariantReference
  | SampleVariantPath;

interface SampleVariantConfig {
  output: string;
  data: SampleVariant;
}

interface SampleDefinition {
  templatePath: string;
  variants: SampleVariantConfig[];
}

interface BatchCompileOptions {
  variants?: Record<string, SampleVariantDefinition | SampleVariantPath>;
  samples: SampleDefinition[];
}
