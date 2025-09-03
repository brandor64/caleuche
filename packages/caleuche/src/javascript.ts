import { formatError } from "./common";

export function valueOrEnvironment(
  useEnvironmentVariable: boolean,
  variableName: string,
  environmentVariable: string,
  value?: string,
  indentationLevel: number = 0,
): string {
  if (!variableName) {
    throw new Error("Variable name must be provided.");
  }
  const indent = "  ".repeat(indentationLevel);

  if (useEnvironmentVariable && environmentVariable) {
    return (
      `const ${variableName} = process.env["${environmentVariable}"];\n` +
      `${indent}if (!${variableName}) {\n` +
      `${indent}  console.error("Please set the ${environmentVariable} environment variable.");\n` +
      `${indent}  process.exit(1);\n` +
      `${indent}}`
    );
  } else if (value) {
    return `const ${variableName} = "${value}";`;
  } else {
    throw formatError(variableName, environmentVariable);
  }
}
