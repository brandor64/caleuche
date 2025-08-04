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
    if (variableName.trim() !== "") {
      throw new Error(`No value provided for variable \"${variableName}\" or environment variable.`);
    } else if (environmentVariable.trim() !== "") {
      throw new Error(`No value provided for environment variable \"${environmentVariable}\".`);
    } else {
      throw new Error("No value provided for variable or environment variable.");
    }
  }
}
