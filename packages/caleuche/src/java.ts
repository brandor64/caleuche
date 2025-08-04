export function valueOrEnvironment(
  useEnvironmentVariable: boolean,
  variableName: string,
  environmentVariable: string,
  value?: string,
  indentationLevel: number = 1,
): string {
  if (!variableName) {
    throw new Error("Variable name must be provided.");
  }
  const indent = "    ".repeat(indentationLevel);

  if (useEnvironmentVariable && environmentVariable) {
    return (
      `String ${variableName} = System.getenv("${environmentVariable}");\n` +
      `${indent}if (${variableName} == null || ${variableName}.isEmpty()) {\n` +
      `${indent}    System.out.println("Please set the ${environmentVariable} environment variable.");\n` +
      `${indent}    System.exit(1);\n` +
      `${indent}}`
    );
  } else if (value) {
    return `String ${variableName} = "${value}";`;
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
