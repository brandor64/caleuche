export function formatError(variableName: string, environmentVariable: string): Error {
  if (variableName.trim() !== "") {
      return new Error(`No value provided for variable "${variableName}" or environment variable.`);
    } else if (environmentVariable.trim() !== "") {
      return new Error(`No value provided for environment variable "${environmentVariable}".`);
    } else {
      return new Error("No value provided for variable or environment variable.");
    }
}