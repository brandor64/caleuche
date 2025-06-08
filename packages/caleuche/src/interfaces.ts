export type Language = "csharp" | "java" | "python" | "go" | "javascript";

export interface Dependency {
  name: string;
  version: string;
}

export type TemplateInput =
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
    };

export interface Sample {
  template: string;
  type: Language;
  dependencies: Dependency[];
  input: TemplateInput[];
}

export interface CompileOptions {
  project: boolean;
}

export interface CompileOutput {
  items: Array<{
    fileName: string;
    content: string;
  }>;
}
