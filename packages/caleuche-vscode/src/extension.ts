// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { parse as parseYaml } from "yaml";
import { resolvePtr } from "dns";
import * as url from "url";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export function activate(_context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Caleuche');
  outputChannel.show();
  outputChannel.appendLine('Caleuche extension activated.');



  const previewCommand = vscode.commands.registerCommand('caleuche.showTemplatePreview', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor.');
      return;
    }
    const templateUri = editor.document.uri;
    if (!templateUri.fsPath.endsWith('.template')) {
      vscode.window.showErrorMessage('Not a .template file.');
      return;
    }
    // Try to find the corresponding YAML file
    const yamlPathUrl = await vscode.window.showOpenDialog({title: 'Select YAML file', canSelectMany: false, filters: {'YAML Files': ['yaml', 'yml']}});
    if (!yamlPathUrl || yamlPathUrl.length === 0) {
      vscode.window.showErrorMessage('No corresponding YAML file found.');
      return;
    }
    const yamlFilePath = url.fileURLToPath(yamlPathUrl[0].toString());
    TemplatePreviewPanel.createOrShow(templateUri, yamlFilePath);
  });

  _context.subscriptions.push(previewCommand);
}

function findYamlForTemplate(templatePath: string, outputChannel?: vscode.OutputChannel): string | null {
  const dir = path.dirname(templatePath);
  outputChannel?.appendLine(`Searching for YAML file in directory: ${dir}`);
  const base = path.basename(templatePath, '.template');
  outputChannel?.appendLine(`Base name for YAML search: ${base}`);
  const yamlNames = [`${base}.yaml`, `${base}.yml`];

  for (const name of yamlNames) {
    outputChannel?.appendLine(`Checking for YAML file: ${name}`);
    const fullPath = path.join(dir, name);
    outputChannel?.appendLine(`Full path for YAML file: ${fullPath}`);
    if (fs.existsSync(fullPath)) {
      outputChannel?.appendLine(`Found YAML file: ${fullPath}`);
      return fullPath;
    }
  }
  outputChannel?.appendLine('No corresponding YAML file found.');
  return null;
}

class TemplatePreviewPanel {
  public static currentPanel: TemplatePreviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _templateUri: vscode.Uri;
  private readonly _yamlPath: string;
  private _disposables: vscode.Disposable[] = [];
  private _templateWatcher?: vscode.FileSystemWatcher;
  private _yamlWatcher?: vscode.FileSystemWatcher;
  private _yamlData: any = {};

  public static createOrShow(templateUri: vscode.Uri, yamlPath: string) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
    if (TemplatePreviewPanel.currentPanel) {
      TemplatePreviewPanel.currentPanel._panel.reveal(column);
      TemplatePreviewPanel.currentPanel.reloadYamlAndUpdate();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'caleucheTemplatePreview',
      'Template Preview',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(path.dirname(templateUri.fsPath))],
      }
    );
    TemplatePreviewPanel.currentPanel = new TemplatePreviewPanel(panel, templateUri, yamlPath);
  }

  private constructor(panel: vscode.WebviewPanel, templateUri: vscode.Uri, yamlPath: string) {
    this._panel = panel;
    this._templateUri = templateUri;
    this._yamlPath = yamlPath;
    this.reloadYamlAndUpdate();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    // Watch for changes to template and yaml files
    this._templateWatcher = vscode.workspace.createFileSystemWatcher(this._templateUri.fsPath);
    this._templateWatcher.onDidChange(() => this.reloadYamlAndUpdate(), this, this._disposables);
    this._yamlWatcher = vscode.workspace.createFileSystemWatcher(this._yamlPath);
    this._yamlWatcher.onDidChange(() => this.reloadYamlAndUpdate(), this, this._disposables);
  }

  private reloadYamlAndUpdate() {
    let yamlContent = '';
    try {
      yamlContent = fs.readFileSync(this._yamlPath, 'utf8');
      this._yamlData = parseYaml(yamlContent);
    } catch {
      this._yamlData = {};
    }
    this.update();
  }

  public update() {
    this._panel.webview.html = this.getHtmlForWebview();
    this._setWebviewMessageListener();
  }

  public dispose() {
    TemplatePreviewPanel.currentPanel = undefined;
    if (this._templateWatcher) { this._templateWatcher.dispose(); }
    if (this._yamlWatcher) { this._yamlWatcher.dispose(); }
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) { d.dispose(); }
    }
  }

  private getHtmlForWebview(): string {
    const yamlData = this._yamlData;
    const inputs = Array.isArray(yamlData.input) ? yamlData.input : [];
    const inputFields = inputs.map((input: any) => {
      let field = '';
      let type = input.type;
      if (type === 'string') {
        field = `<input id=\"input_${input.name}\" name=\"${input.name}\" type=\"text\" ${input.required ? 'required' : ''} value=\"${input.default ?? ''}\" />`;
      } else if (type === 'number') {
        field = `<input id=\"input_${input.name}\" name=\"${input.name}\" type=\"number\" ${input.required ? 'required' : ''} value=\"${input.default ?? ''}\" />`;
      } else if (type === 'boolean') {
        field = `<input id=\"input_${input.name}\" name=\"${input.name}\" type=\"checkbox\" ${input.required ? 'required' : ''} ${input.default ? 'checked' : ''} />`;
      } else if (type === 'array') {
        field = `<textarea id=\"input_${input.name}\" name=\"${input.name}\" ${input.required ? 'required' : ''} placeholder=\"Comma-separated values\">${Array.isArray(input.default) ? input.default.join(',') : ''}</textarea>`;
      } else if (type === 'object') {
        field = `<textarea id=\"input_${input.name}\" name=\"${input.name}\" ${input.required ? 'required' : ''} placeholder=\"JSON object\">${input.default ? JSON.stringify(input.default) : ''}</textarea>`;
      }
      return `
        <div style=\"margin-bottom:8px;\">
          <label for=\"input_${input.name}\"><b>${input.name}</b>${input.required ? ' *' : ''}</label><br/>
          ${field}
          <div style=\"font-size:smaller;color:#666;\">${input.description || ''}</div>
        </div>
      `;
    }).join('');

    // Determine language for syntax highlighting
    let lang = yamlData.type || 'plaintext';
    // Map to highlight.js language names
    const langMap: Record<string, string> = {
      csharp: 'csharp',
      java: 'java',
      python: 'python',
      go: 'go',
      javascript: 'javascript',
    };
    lang = langMap[lang] || 'plaintext';

    return `
      <html>
      <head>
        <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css\">
        <script src=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js\"></script>
        <script src=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/${lang}.min.js\"></script>
      </head>
      <body>
        <h2>Template Inputs</h2>
        <form id=\"inputs\">
          ${inputFields}
        </form>
        <h2>Preview</h2>
        <pre><code id=\"preview\" class=\"language-${lang}\">(preview will go here)</code></pre>
        <script>
          const vscode = acquireVsCodeApi();
          function gatherInputs() {
            const form = document.getElementById('inputs');
            const data = {};
            for (const el of form.elements) {
              if (!el.name) continue;
              if (el.type === 'checkbox') {
                data[el.name] = el.checked;
              } else if (el.type === 'number') {
                data[el.name] = el.value === '' ? undefined : Number(el.value);
              } else if (el.type === 'textarea' && el.placeholder === 'Comma-separated values') {
                data[el.name] = el.value.split(',').map(v => v.trim()).filter(v => v.length > 0);
              } else if (el.type === 'textarea' && el.placeholder === 'JSON object') {
                try { data[el.name] = JSON.parse(el.value); } catch { data[el.name] = {}; }
              } else {
                data[el.name] = el.value;
              }
            }
            return data;
          }
          function sendUpdate() {
            vscode.postMessage({ type: 'updateInputs', data: gatherInputs() });
          }
          document.getElementById('inputs').addEventListener('input', sendUpdate);
          document.getElementById('inputs').addEventListener('change', sendUpdate);
          // Initial send
          sendUpdate();
          window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.type === 'preview') {
              const code = document.getElementById('preview');
              code.textContent = msg.content;
              window.hljs && window.hljs.highlightElement(code);
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  private _setWebviewMessageListener() {
    this._panel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'updateInputs') {
        const preview = await this._generatePreview(message.data);
        this._panel.webview.postMessage({ type: 'preview', content: preview });
      }
    }, undefined, this._disposables);
  }

  private async _generatePreview(inputs: Record<string, any>): Promise<string> {
    // Read template file
    let templateContent = '';
    try {
      templateContent = fs.readFileSync(this._templateUri.fsPath, 'utf8');
    } catch (e) {
      return 'Failed to read template file.';
    }
    // Compose sample object
    let yamlContent = '';
    let yamlData: any = {};
    try {
      yamlContent = fs.readFileSync(this._yamlPath, 'utf8');
      yamlData = parseYaml(yamlContent);
    } catch {}
    const sample = {
      ...yamlData,
      template: templateContent,
    };
    try {
      const core = await import('@caleuche/core');
      const output = core.compileSample(sample, inputs, { project: false });
      if (output && output.items && output.items.length > 0) {
        // Find the main output file (not requirements.txt, etc)
        const main = output.items.find(i => i.fileName && i.fileName.startsWith('sample')) || output.items[0];
        return main.content;
      }
      return 'No output.';
    } catch (e) {
      return 'Error generating preview: ' + (e && typeof e === 'object' && 'message' in e ? (e as any).message : String(e));
    }
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
