import * as vscode from "vscode";
import { CaleucheVirtualDocumentProvider } from "./virtualDocumentProvider";

export function activate(context: vscode.ExtensionContext) {
  const virtualDocProvider = new CaleucheVirtualDocumentProvider(context);

  const previewCommand = vscode.commands.registerCommand(
    'caleuche.showPreview',
    () => virtualDocProvider.showPreview()
  );

  const previewToSideCommand = vscode.commands.registerCommand(
    'caleuche.showPreviewToSide',
    () => virtualDocProvider.showPreview(vscode.ViewColumn.Beside)
  );

  context.subscriptions.push(previewCommand);
  context.subscriptions.push(previewToSideCommand);
  context.subscriptions.push({
    dispose: () => virtualDocProvider.dispose()
  });
}

export function deactivate() {}
