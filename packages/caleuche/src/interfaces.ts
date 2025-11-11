export type Language = "csharp" | "java" | "python" | "go" | "javascript" | "shell";

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
    }
  | {
      name: string;
      type: "array";
      itemsType: "string" | "number" | "boolean" | "object";
      required: boolean;
      default?: Array<string | number | boolean | Record<string, any>>;
    };

export interface Sample {
  template: string;
  type: Language;
  dependencies: Dependency[];
  input: TemplateInput[];
  tags?: Record<string, any>;
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
