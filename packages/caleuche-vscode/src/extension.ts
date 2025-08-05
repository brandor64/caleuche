import * as vscode from "vscode";
import { PreviewManager } from "./preview";

export function activate(context: vscode.ExtensionContext) {
  const previewManager = new PreviewManager(context);

  const previewCommand = vscode.commands.registerCommand(
    'caleuche.showPreview',
    () => previewManager.showPreview()
  );

  const previewToSideCommand = vscode.commands.registerCommand(
    'caleuche.showPreviewToSide',
    () => previewManager.showPreview(vscode.ViewColumn.Beside)
  );

  context.subscriptions.push(previewCommand);
  context.subscriptions.push(previewToSideCommand);
}

export function deactivate() {}
