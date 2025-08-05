import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { parse as parseYaml } from "yaml";
import { compileSample } from "@caleuche/core";
import {
    getCommonStyles,
    getShikiIncludes,
    getCommonJavaScript,
    mapLanguageForShiki,
    generateSyntaxHighlightedHtml
} from "./htmlUtils";
import { TemplateInputViewProvider } from "./inputView";

function findYamlForTemplate(templatePath: string): string | null {
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
        console.error('Error finding YAML file for template:', error);
        return null;
    }
}

function isTemplateFile(document: vscode.TextDocument): boolean {
    return document.fileName.endsWith('.template') || document.fileName.endsWith('.tmpl');
}

export class PreviewManager {
    private templatePreviews = new Map<string, TemplatePreview>();
    private inputViewProvider: TemplateInputViewProvider;

    constructor(private context: vscode.ExtensionContext) {
        this.inputViewProvider = new TemplateInputViewProvider(context.extensionUri);

        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                TemplateInputViewProvider.viewType,
                this.inputViewProvider
            )
        );

        vscode.commands.executeCommand('setContext', 'caleucheTemplateActive', false);

        console.log('Caleuche WebView initialized');
    }

    public getInputViewProvider(): TemplateInputViewProvider {
        return this.inputViewProvider;
    }

    public async showPreview(column: vscode.ViewColumn = vscode.ViewColumn.Active) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const document = editor.document;
        const panelKey = document.uri.toString();

        if (!isTemplateFile(document)) {
            vscode.window.showErrorMessage('This command only works with Caleuche template files (.template or .tmpl)');
            return;
        }

        return this.showTemplatePreview(document, panelKey, column);
    }

    private async showTemplatePreview(
        document: vscode.TextDocument,
        panelKey: string,
        column: vscode.ViewColumn
    ) {
        try {
            if (this.templatePreviews.has(panelKey)) {
                const templatePreview = this.templatePreviews.get(panelKey)!;
                templatePreview.panel.reveal(column);
                await templatePreview.update();
                return;
            }

            const templatePreview = await TemplatePreview.create(
                document.uri,
                this.context,
                column,
                this.inputViewProvider
            );

            if (!templatePreview) {
                return;
            }

            this.templatePreviews.set(panelKey, templatePreview);

            vscode.commands.executeCommand('setContext', 'caleucheTemplateActive', true);

            vscode.commands.executeCommand('workbench.view.extension.caleucheTemplateInputs');

            templatePreview.panel.onDidDispose(() => {
                this.templatePreviews.delete(panelKey);
                if (this.templatePreviews.size === 0) {
                    this.inputViewProvider.clear();
                    vscode.commands.executeCommand('setContext', 'caleucheTemplateActive', false);
                }
            });

            const changeListener = vscode.workspace.onDidChangeTextDocument(e => {
                if (e.document === document) {
                    try {
                        templatePreview.update();
                    } catch (error) {
                        console.error('Error updating template preview:', error);
                    }
                }
            });

            templatePreview.panel.onDidDispose(() => changeListener.dispose());
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to show template preview: ${errorMessage}`);
            console.error('Error in showTemplatePreview:', error);
        }
    }
}

export class TemplatePreview {
    public readonly panel: vscode.WebviewPanel;
    private readonly templateUri: vscode.Uri;
    private readonly yamlPath: string;
    private readonly context: vscode.ExtensionContext;
    private readonly inputsProvider?: TemplateInputViewProvider;
    private disposables: vscode.Disposable[] = [];
    private templateWatcher?: vscode.FileSystemWatcher;
    private yamlWatcher?: vscode.FileSystemWatcher;
    private yamlData: any = {};
    private currentInputs: Record<string, any> = {};

    constructor(
        panel: vscode.WebviewPanel,
        templateUri: vscode.Uri,
        yamlPath: string,
        context: vscode.ExtensionContext,
        inputsProvider?: TemplateInputViewProvider
    ) {
        this.panel = panel;
        this.templateUri = templateUri;
        this.yamlPath = yamlPath;
        this.context = context;
        this.inputsProvider = inputsProvider;

        this.reloadYamlAndUpdate();
        this.setupWatchers();
        this.setupPanelListeners();
    }

    public static async create(
        templateUri: vscode.Uri,
        context: vscode.ExtensionContext,
        column: vscode.ViewColumn = vscode.ViewColumn.Active,
        inputsProvider?: TemplateInputViewProvider
    ): Promise<TemplatePreview | null> {
        try {
            let yamlPath = findYamlForTemplate(templateUri.fsPath);

            if (!yamlPath) {
                const yamlPathUrl = await vscode.window.showOpenDialog({
                    title: "Select YAML file for template",
                    canSelectMany: false,
                    filters: { "YAML Files": ["yaml", "yml"] },
                    defaultUri: vscode.Uri.file(path.dirname(templateUri.fsPath))
                });

                if (!yamlPathUrl || yamlPathUrl.length === 0) {
                    vscode.window.showWarningMessage("No YAML file selected for template. Template preview cancelled.");
                    return null;
                }
                yamlPath = yamlPathUrl[0].fsPath;
            }

            if (!fs.existsSync(yamlPath)) {
                vscode.window.showErrorMessage(`YAML file not found: ${yamlPath}`);
                return null;
            }

            try {
                fs.accessSync(yamlPath, fs.constants.R_OK);
            } catch {
                vscode.window.showErrorMessage(`Cannot read YAML file: ${yamlPath}`);
                return null;
            }

            const panel = vscode.window.createWebviewPanel(
                "caleucheTemplatePreview",
                `Template Preview: ${path.basename(templateUri.fsPath)}`,
                column,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.joinPath(context.extensionUri, 'media'),
                        vscode.Uri.file(path.dirname(templateUri.fsPath))
                    ]
                }
            );

            return new TemplatePreview(panel, templateUri, yamlPath, context, inputsProvider);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to create template preview: ${errorMessage}`);
            console.error('Error creating template preview:', error);
            return null;
        }
    }

    private setupWatchers() {
        this.templateWatcher = vscode.workspace.createFileSystemWatcher(
            this.templateUri.fsPath
        );
        this.templateWatcher.onDidChange(
            () => this.reloadYamlAndUpdate(),
            this,
            this.disposables
        );

        this.yamlWatcher = vscode.workspace.createFileSystemWatcher(
            this.yamlPath
        );
        this.yamlWatcher.onDidChange(
            () => this.reloadYamlAndUpdate(),
            this,
            this.disposables
        );
    }

    private setupPanelListeners() {
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.setWebviewMessageListener();
    }

    private reloadYamlAndUpdate() {
        let yamlContent = "";
        try {
            yamlContent = fs.readFileSync(this.yamlPath, "utf8");
            this.yamlData = parseYaml(yamlContent);

            if (this.yamlData && typeof this.yamlData === 'object') {
                if (this.yamlData.input && !Array.isArray(this.yamlData.input)) {
                    console.warn('YAML input field is not an array, converting...');
                    this.yamlData.input = [];
                }
            } else {
                console.warn('Invalid YAML structure, using empty object');
                this.yamlData = {};
            }
        } catch (error) {
            console.error('Error loading YAML file:', error);
            this.yamlData = {};
        }

        this.setupInputsProvider();
        this.update();
    }

    private setupInputsProvider() {
        if (!this.inputsProvider) {
            return;
        }

        const inputs = Array.isArray(this.yamlData.input) ? this.yamlData.input : [];

        if (inputs.length === 0) {
            this.inputsProvider.clear();
            return;
        }

        this.inputsProvider.setInputs(inputs, (inputData: Record<string, any>) => {
            this.currentInputs = inputData;
            this.updatePreview();
        });

        vscode.commands.executeCommand('setContext', 'caleucheTemplateActive', true);

        this.updatePreview();
    }

    private async updatePreview() {
        console.log('Updating preview with inputs:', this.currentInputs);
        const preview = await this.generatePreview(this.currentInputs);
        
        const rawLanguage = this.yamlData.type || "plaintext";
        const language = mapLanguageForShiki(rawLanguage);
        const highlightedHtml = await generateSyntaxHighlightedHtml(preview, language);
        
        this.panel.webview.postMessage({
            type: "preview",
            html: highlightedHtml,
        });
    }

    public update() {
        this.panel.webview.html = this.getHtmlForWebview();
        this.updatePreview();
    }

    public dispose() {
        this.templateWatcher?.dispose();
        this.yamlWatcher?.dispose();

        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }

    private getHtmlForWebview(): string {
        try {
            const yamlData = this.yamlData;

            const rawLanguage = yamlData.type || "plaintext";
            const language = mapLanguageForShiki(rawLanguage);

            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Template Preview</title>
    ${getShikiIncludes()}
    <style>
        ${getCommonStyles()}

        body {
            margin: 0;
            padding: 0;
            overflow: auto;
        }

        .preview-container {
            margin: 0;
            padding: 0;
            max-width: none;
            overflow: visible;
        }

        pre {
            margin: 0;
            border: none;
            border-radius: 0;
            background-color: var(--vscode-editor-background);
            overflow: visible;
            padding: 16px;
            white-space: pre;
        }

        code {
            white-space: pre;
        }
    </style>
</head>
<body>
    <div id="preview-container">⏳ Initializing preview...</div>

    <script>
        const vscode = acquireVsCodeApi();
        ${getCommonJavaScript()}
    </script>
</body>
</html>`;
        } catch (error) {
            console.error('Error generating HTML for webview:', error);
            return `
                <html>
                <body style="font-family: sans-serif; padding: 20px; color: #d4d4d4; background-color: #1e1e1e;">
                    <h3>❌ Template Preview Error</h3>
                    <p>Failed to generate template preview interface.</p>
                    <p>Error: ${error instanceof Error ? error.message : String(error)}</p>
                </body>
                </html>
            `;
        }
    }

    private setWebviewMessageListener() {
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                console.log('Main panel received message:', message);
            },
            undefined,
            this.disposables
        );
    }

    private async generatePreview(inputs: Record<string, any>): Promise<string> {
        try {
            let templateContent = "";
            try {
                templateContent = fs.readFileSync(this.templateUri.fsPath, "utf8");
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                return `❌ Failed to read template file: ${errorMsg}`;
            }

            if (!templateContent.trim()) {
                return "⚠️ Template file is empty";
            }

            let yamlData: any = {};
            try {
                const yamlContent = fs.readFileSync(this.yamlPath, "utf8");
                yamlData = parseYaml(yamlContent);
            } catch (error) {
                console.warn('Failed to re-read YAML file, using cached data:', error);
                yamlData = this.yamlData;
            }

            const sample = {
                ...yamlData,
                template: templateContent,
            };

            if (!sample.template) {
                return "❌ No template content found";
            }

            try {
                const output = compileSample(sample, inputs, { project: false });

                if (!output) {
                    return "⚠️ Compilation returned no output";
                }

                if (!output.items || !Array.isArray(output.items) || output.items.length === 0) {
                    return "⚠️ No output items generated";
                }

                const main = output.items.find(
                    (i: any) => i.fileName && i.fileName.startsWith("sample")
                ) || output.items[0];

                if (!main || !main.content) {
                    return "⚠️ No content in generated output";
                }

                return main.content;
            } catch (compilationError) {
                const errorMsg = compilationError instanceof Error
                    ? compilationError.message
                    : String(compilationError);

                console.error('Template compilation error:', compilationError);

                if (errorMsg.includes('Template compilation failed')) {
                    return `❌ Template compilation failed:\n${errorMsg}`;
                } else if (errorMsg.includes('undefined')) {
                    return `❌ Template variable error - check that all required inputs are provided:\n${errorMsg}`;
                } else {
                    return `❌ Compilation error:\n${errorMsg}`;
                }
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('Unexpected error in generatePreview:', error);
            return `❌ Unexpected error: ${errorMsg}`;
        }
    }
}
