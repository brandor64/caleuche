import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { parse as parseYaml } from "yaml";
import { compileSample } from "@caleuche/core";
import { TemplateInputViewProvider } from "./inputView";

interface VirtualDocumentInfo {
  templateUri: vscode.Uri;
  yamlPath: string;
  inputs: Record<string, any>;
  language: string;
}

export class CaleucheVirtualDocumentProvider
  implements vscode.TextDocumentContentProvider
{
  private static readonly scheme = "caleuche-preview";

  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  private _documents = new Map<string, VirtualDocumentInfo>();
  private _disposables: vscode.Disposable[] = [];
  private _inputViewProvider: TemplateInputViewProvider;

  public readonly onDidChange = this._onDidChange.event;

  constructor(context: vscode.ExtensionContext) {
    this._inputViewProvider = new TemplateInputViewProvider(
      context.extensionUri,
    );

    const provider = vscode.workspace.registerTextDocumentContentProvider(
      CaleucheVirtualDocumentProvider.scheme,
      this,
    );

    context.subscriptions.push(provider);
    context.subscriptions.push(this._onDidChange);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        TemplateInputViewProvider.viewType,
        this._inputViewProvider,
      ),
    );

    this._disposables.push(provider);
    vscode.commands.executeCommand(
      "setContext",
      "caleucheTemplateActive",
      false,
    );
  }

  public async showPreview(
    column: vscode.ViewColumn = vscode.ViewColumn.Active,
  ): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor found");
      return;
    }

    const document = editor.document;
    if (!this._isTemplateFile(document)) {
      vscode.window.showErrorMessage(
        "This command only works with Caleuche template files (.template or .tmpl)",
      );
      return;
    }

    await this._createPreviewDocument(document, column);
  }

  private async _createPreviewDocument(
    document: vscode.TextDocument,
    column: vscode.ViewColumn = vscode.ViewColumn.Beside,
  ): Promise<void> {
    try {
      let yamlPath = this._findYamlForTemplate(document.uri.fsPath);
      if (!yamlPath) {
        const yamlPathUrl = await vscode.window.showOpenDialog({
          title: "Select YAML file for template",
          canSelectMany: false,
          filters: { "YAML Files": ["yaml", "yml"] },
          defaultUri: vscode.Uri.file(path.dirname(document.uri.fsPath)),
        });

        if (!yamlPathUrl || yamlPathUrl.length === 0) {
          vscode.window.showWarningMessage(
            "No YAML file selected for template. Preview cancelled.",
          );
          return;
        }

        yamlPath = yamlPathUrl[0].fsPath;
      }

      const language = await this._determineLanguage(document.uri, yamlPath);
      const virtualUri = this._createVirtualUri(document.uri, language);

      this._documents.set(virtualUri.toString(), {
        templateUri: document.uri,
        yamlPath,
        inputs: {},
        language,
      });

      const textDocument = await vscode.workspace.openTextDocument(virtualUri);
      await vscode.window.showTextDocument(textDocument, column);

      this._setupWatchers(virtualUri, document.uri, yamlPath);
      this._setupInputsProvider(document.uri, yamlPath);

      vscode.commands.executeCommand(
        "setContext",
        "caleucheTemplateActive",
        true,
      );
      vscode.commands.executeCommand(
        "workbench.view.extension.caleucheTemplateInputs",
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to create preview document: ${error}`,
      );
    }
  }

  public updateInputs(
    templateUri: vscode.Uri,
    inputs: Record<string, any>,
  ): void {
    for (const [uriString, docInfo] of this._documents.entries()) {
      if (docInfo.templateUri.toString() === templateUri.toString()) {
        docInfo.inputs = inputs;
        this._onDidChange.fire(vscode.Uri.parse(uriString));
        break;
      }
    }
  }

  public async provideTextDocumentContent(
    uri: vscode.Uri,
    token: vscode.CancellationToken,
  ): Promise<string> {
    const docInfo = this._documents.get(uri.toString());

    if (!docInfo) {
      return "Virtual document not found";
    }

    if (token.isCancellationRequested) {
      return "Content generation cancelled";
    }

    try {
      return await this._generateContent(docInfo);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `Error generating content: ${errorMsg}`;
    }
  }

  public dispose(): void {
    this._documents.clear();
    this._disposables.forEach((d) => d.dispose());
    this._disposables.length = 0;
  }

  private _createVirtualUri(
    templateUri: vscode.Uri,
    language: string,
  ): vscode.Uri {
    const templateName = path.basename(templateUri.fsPath, ".template");
    const languageExt = this._getLanguageExtension(language);

    const uniqueId = Buffer.from(templateUri.toString())
      .toString("base64")
      .slice(0, 8);

    return vscode.Uri.parse(
      `${CaleucheVirtualDocumentProvider.scheme}:/${templateName}-preview-${uniqueId}${languageExt}`,
    );
  }

  private async _determineLanguage(
    templateUri: vscode.Uri,
    yamlPath: string,
  ): Promise<string> {
    try {
      const yamlContent = fs.readFileSync(yamlPath, "utf8");
      const yamlData = parseYaml(yamlContent);

      if (yamlData && yamlData.type) {
        return yamlData.type;
      }
    } catch (error) {
      console.warn("Could not read language from YAML:", error);
    }

    const templateName = path.basename(templateUri.fsPath);

    if (templateName.includes(".cs.")) {
      return "csharp";
    }
    if (templateName.includes(".js.")) {
      return "javascript";
    }
    if (templateName.includes(".ts.")) {
      return "typescript";
    }
    if (templateName.includes(".py.")) {
      return "python";
    }
    if (templateName.includes(".java.")) {
      return "java";
    }
    if (templateName.includes(".go.")) {
      return "go";
    }
    if (templateName.includes(".cpp.") || templateName.includes(".cc.")) {
      return "cpp";
    }
    if (templateName.includes(".c.")) {
      return "c";
    }

    return "text";
  }

  private _getLanguageExtension(language: string): string {
    const extensionMap: Record<string, string> = {
      csharp: ".cs",
      javascript: ".js",
      typescript: ".ts",
      python: ".py",
      java: ".java",
      go: ".go",
      cpp: ".cpp",
      c: ".c",
      html: ".html",
      css: ".css",
      json: ".json",
      yaml: ".yaml",
      xml: ".xml",
      markdown: ".md",
      bash: ".sh",
      powershell: ".ps1",
      sql: ".sql",
      rust: ".rs",
      php: ".php",
      ruby: ".rb",
    };

    return extensionMap[language] || ".txt";
  }

  private async _generateContent(
    docInfo: VirtualDocumentInfo,
  ): Promise<string> {
    try {
      const templateContent = fs.readFileSync(
        docInfo.templateUri.fsPath,
        "utf8",
      );

      if (!templateContent.trim()) {
        return "Template file is empty";
      }

      const yamlContent = fs.readFileSync(docInfo.yamlPath, "utf8");
      const yamlData = parseYaml(yamlContent);

      const sample = {
        ...yamlData,
        template: templateContent,
      };

      const output = compileSample(sample, docInfo.inputs, { project: false });

      if (!output || !output.items || output.items.length === 0) {
        return "No output generated from template";
      }

      const main =
        output.items.find(
          (item: any) => item.fileName && item.fileName.startsWith("sample"),
        ) || output.items[0];

      if (!main || !main.content) {
        return "No content in generated output";
      }

      return main.content;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const commentPrefix = this._getCommentPrefix(docInfo.language);

      return [
        `${commentPrefix} Template compilation failed`,
        `${commentPrefix} Error: ${errorMsg}`,
        `${commentPrefix}`,
        `${commentPrefix} Check that:`,
        `${commentPrefix} - All required inputs are provided`,
        `${commentPrefix} - Template syntax is correct`,
        `${commentPrefix} - YAML configuration is valid`,
      ].join("\n");
    }
  }

  private _getCommentPrefix(language: string): string {
    const commentMap: Record<string, string> = {
      csharp: "//",
      javascript: "//",
      typescript: "//",
      java: "//",
      go: "//",
      cpp: "//",
      c: "//",
      rust: "//",
      php: "//",
      python: "#",
      bash: "#",
      yaml: "#",
      powershell: "#",
      ruby: "#",
      html: "<!--",
      xml: "<!--",
      css: "/*",
      sql: "--",
    };

    return commentMap[language] || "//";
  }

  private _setupWatchers(
    virtualUri: vscode.Uri,
    templateUri: vscode.Uri,
    yamlPath: string,
  ): void {
    const templateWatcher = vscode.workspace.createFileSystemWatcher(
      templateUri.fsPath,
    );
    templateWatcher.onDidChange(() => {
      this._onDidChange.fire(virtualUri);
    });

    const yamlWatcher = vscode.workspace.createFileSystemWatcher(yamlPath);
    yamlWatcher.onDidChange(() => {
      this._onDidChange.fire(virtualUri);
    });

    const disposable = vscode.workspace.onDidCloseTextDocument((doc) => {
      if (doc.uri.toString() === virtualUri.toString()) {
        templateWatcher.dispose();
        yamlWatcher.dispose();
        this._documents.delete(virtualUri.toString());
        disposable.dispose();
      }
    });

    this._disposables.push(templateWatcher, yamlWatcher, disposable);
  }

  private _setupInputsProvider(
    templateUri: vscode.Uri,
    yamlPath: string,
  ): void {
    try {
      const yamlContent = fs.readFileSync(yamlPath, "utf8");
      const yamlData = parseYaml(yamlContent);
      const inputs = Array.isArray(yamlData.input) ? yamlData.input : [];

      if (inputs.length === 0) {
        this._inputViewProvider.clear();
        return;
      }

      this._inputViewProvider.setInputs(
        inputs,
        (inputData: Record<string, any>) => {
          this.updateInputs(templateUri, inputData);
        },
      );
    } catch (error) {
      console.error("Error setting up inputs provider:", error);
      this._inputViewProvider.clear();
    }
  }

  private _isTemplateFile(document: vscode.TextDocument): boolean {
    return (
      document.fileName.endsWith(".template") ||
      document.fileName.endsWith(".tmpl")
    );
  }

  private _findYamlForTemplate(templatePath: string): string | null {
    try {
      const dir = path.dirname(templatePath);
      const base = path.basename(templatePath, ".template");
      const yamlNames = [`${base}.yaml`, `${base}.yml`];

      for (const name of yamlNames) {
        const fullPath = path.join(dir, name);
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
      return null;
    } catch (error) {
      console.error("Error finding YAML file for template:", error);
      return null;
    }
  }
}
