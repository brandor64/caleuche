import _ from "lodash";
import { CompileOptions, CompileOutput, Sample } from "./interfaces";
import * as csharp from "./csharp";
import * as go from "./go";
import * as python from "./python";
import * as java from "./java";

function fillInputObject(
  sample: Sample,
  inputData: Record<string, any>,
): Record<string, any> {
  const inputObject: Record<string, any> = {};
  for (const { name, required, default: defaultValue } of sample.input) {
    if (name in inputData) {
      /* TODO: Check type */
      inputObject[name] = inputData[name];
    } else {
      if (!required) {
        inputObject[name] = defaultValue;
        continue;
      }
      throw new Error(
        `Missing required input: ${name}. Please provide a value for this input.`,
      );
    }
  }
  return inputObject;
}

const regex = /[ \t]*(<%(?!=)[^%]+%>)\r?\n/g;

function preprocessTemplate(template: string): string {
  return template.replace(regex, "$1");
}

import buildGradle from "../project-templates/build.gradle.template";
import csproj from "../project-templates/Sample.csproj.template";
import gomod from "../project-templates/go.mod.template";
import packageJson from "../project-templates/package.json.template";
import pomXml from "../project-templates/pom.xml.template";
import requirementsTxt from "../project-templates/requirements.txt.template";

function getProjectFileTemplate(sample: Sample): {
  targetFileName: string;
  template: string;
} {
  const language = sample.type;
  switch (language) {
    case "csharp":
      return {
        targetFileName: `Sample.csproj`,
        template: preprocessTemplate(csproj),
      };
    case "go":
      return {
        targetFileName: `go.mod`,
        template: preprocessTemplate(gomod),
      };
    case "javascript":
      return {
        targetFileName: `package.json`,
        template: preprocessTemplate(packageJson),
      };
    case "java":
      if (sample.buildSystem === "gradle") {
        return {
          targetFileName: `build.gradle`,
          template: preprocessTemplate(buildGradle),
        };
      } else {
        return {
          targetFileName: `pom.xml`,
          template: preprocessTemplate(pomXml),
        };
      }
    case "python":
      return {
        targetFileName: `requirements.txt`,
        template: preprocessTemplate(requirementsTxt),
      };
    default:
      throw new Error(
        `Unsupported language: ${language}. Cannot generate project file.`,
      );
  }
}

function generateProjectFile(sample: Sample) {
  const { targetFileName, template } = getProjectFileTemplate(sample);
  const compiledTemplate = _.template(template);
  const instantiatedTemplate = compiledTemplate({
    dependencies: sample.dependencies,
  });
  return {
    fileName: targetFileName,
    content: instantiatedTemplate,
  };
}

function getTargetFileName(sample: Sample): string {
  const language = sample.type;
  switch (language) {
    case "csharp":
      return "Sample.cs";
    case "go":
      return "sample.go";
    case "javascript":
      return "sample.js";
    case "java":
      return "Sample.java";
    case "python":
      return "sample.py";
    default:
      throw new Error(
        `Unsupported language: ${language}. Cannot generate sample file.`,
      );
  }
}

export function compileSample(
  sample: Sample,
  input: Record<string, any>,
  options: CompileOptions,
): CompileOutput {
  const output: CompileOutput = { items: [] };
  if (options.project) {
    const projectFile = generateProjectFile(sample);
    output.items.push(projectFile);
  }

  const inputObject = fillInputObject(sample, input);
  const processedTemplate = preprocessTemplate(sample.template);

  const compiledTemplate = _.template(processedTemplate, {
    imports: {
      csharp: csharp,
      go: go,
      python: python,
      java: java,
    },
  });
  const targetFileName = getTargetFileName(sample);
  const outputFileContent = compiledTemplate(inputObject);
  output.items.push({
    fileName: targetFileName,
    content: outputFileContent,
  });
  return output;
}
