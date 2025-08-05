import { formatError } from "./common";

export function valueOrEnvironment(
  useEnvironmentVariable: boolean,
  variableName: string,
  environmentVariable: string,
  value?: string,
  indentationLevel: number = 0,
) {
  if (!variableName) {
    throw new Error("Variable name must be provided.");
  }
  const indent = "  ".repeat(indentationLevel);
  if (useEnvironmentVariable && environmentVariable) {
    return (
      `${variableName} = os.environ.get("${environmentVariable}")\n` +
      `${indent}if not ${variableName}:\n` +
      `${indent}  raise ValueError("Please set the ${environmentVariable} environment variable.")\n`
    );
  } else if (value) {
    return `${variableName} = "${value}"`;
  } else {
    throw formatError(variableName, environmentVariable);
  }
}
