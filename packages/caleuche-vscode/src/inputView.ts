import * as vscode from 'vscode';
import { escapeHtml, escapeAttribute } from './htmlUtils';

export class TemplateInputViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'caleucheTemplateInputs';

    private _view?: vscode.WebviewView;
    private _inputs: any[] = [];
    private _currentValues: Record<string, any> = {};
    private _onInputChange?: (inputs: Record<string, any>) => void;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            message => {
                if (message.type === 'inputChange') {
                    this._handleInputChange(message.name, message.value);
                }
            }
        );
    }

    public setInputs(inputs: any[], onChange: (inputs: Record<string, any>) => void) {
        this._inputs = inputs;
        this._onInputChange = onChange;

        this._currentValues = {};
        inputs.forEach(input => {
            this._currentValues[input.name] = input.default ?? this._getDefaultValue(input.type);
        });

        this._updateWebview();

        if (this._onInputChange) {
            this._onInputChange(this._currentValues);
        }
    }

    public clear() {
        this._inputs = [];
        this._currentValues = {};
        this._updateWebview();
    }

    private _handleInputChange(name: string, value: any) {
        const input = this._inputs.find(i => i.name === name);
        if (!input) {
            return;
        }

        let parsedValue = value;

        try {
            switch (input.type) {
                case 'number':
                    parsedValue = value === '' ? '' : Number(value);
                    break;
                case 'boolean':
                    parsedValue = Boolean(value);
                    break;
                case 'array':
                    parsedValue = value ? value.split(',').map((v: string) => v.trim()).filter((v: string) => v) : [];
                    break;
                case 'object':
                    parsedValue = value ? JSON.parse(value) : {};
                    break;
                default:
                    parsedValue = value;
            }
        } catch (error) {
            console.warn('Failed to parse input value:', error);
            return;
        }

        this._currentValues[name] = parsedValue;

        console.log('Input changed:', name, 'to:', parsedValue);
        console.log('All current values:', this._currentValues);

        if (this._onInputChange) {
            this._onInputChange(this._currentValues);
        }
    }

    private _updateWebview() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    private _getDefaultValue(type: string): any {
        switch (type) {
            case 'number': return 0;
            case 'boolean': return false;
            case 'array': return [];
            case 'object': return {};
            default: return '';
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        if (this._inputs.length === 0) {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Template Inputs</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 16px;
            margin: 0;
        }
        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="empty-state">
        No template inputs available.<br>
        Open a template file to see inputs here.
    </div>
</body>
</html>`;
        }

        const inputsHtml = this._inputs.map(input => this._generateInputHtml(input)).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Template Inputs</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 16px;
            margin: 0;
        }

        .input-group {
            margin-bottom: 16px;
        }

        .input-label {
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }

        .input-label.required::after {
            content: " *";
            color: var(--vscode-errorForeground);
        }

        .input-description {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 6px;
        }

        input, textarea, select {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
            box-sizing: border-box;
        }

        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        textarea {
            resize: vertical;
            min-height: 60px;
            font-family: var(--vscode-editor-font-family, monospace);
        }

        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .checkbox-container input[type="checkbox"] {
            width: auto;
            margin: 0;
        }

        .input-type {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="inputs-container">
        ${inputsHtml}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function handleInputChange(name, value, type) {
            vscode.postMessage({
                type: 'inputChange',
                name: name,
                value: value
            });
        }

        document.querySelectorAll('input, textarea, select').forEach(element => {
            const name = element.name;
            const type = element.dataset.inputType;

            element.addEventListener('input', (e) => {
                let value = e.target.value;
                if (type === 'boolean') {
                    value = e.target.checked;
                }
                handleInputChange(name, value, type);
            });

            element.addEventListener('change', (e) => {
                let value = e.target.value;
                if (type === 'boolean') {
                    value = e.target.checked;
                }
                handleInputChange(name, value, type);
            });
        });
    </script>
</body>
</html>`;
    }

    private _generateInputHtml(input: any): string {
        const name = escapeAttribute(input.name);
        const label = escapeHtml(input.name);
        const description = input.description ? escapeHtml(input.description) : '';
        const required = input.required ? 'required' : '';
        const requiredClass = input.required ? 'required' : '';
        const currentValue = this._currentValues[input.name] ?? input.default ?? this._getDefaultValue(input.type);
        const inputType = input.type || 'string';

        switch (inputType) {
            case 'boolean':
                const checked = Boolean(currentValue) ? 'checked' : '';
                return `
                    <div class="input-group">
                        <div class="checkbox-container">
                            <input type="checkbox" name="${name}" data-input-type="boolean" ${checked} ${required}>
                            <label class="input-label ${requiredClass}" for="${name}">${label}</label>
                            <span class="input-type">(boolean)</span>
                        </div>
                        ${description ? `<div class="input-description">${description}</div>` : ''}
                    </div>
                `;

            case 'number':
                const numValue = escapeAttribute(String(currentValue || ''));
                return `
                    <div class="input-group">
                        <label class="input-label ${requiredClass}">${label} <span class="input-type">(number)</span></label>
                        ${description ? `<div class="input-description">${description}</div>` : ''}
                        <input type="number" name="${name}" data-input-type="number" value="${numValue}" ${required}>
                    </div>
                `;

            case 'array':
                const arrayValue = Array.isArray(currentValue) ? escapeAttribute(currentValue.join(', ')) : '';
                return `
                    <div class="input-group">
                        <label class="input-label ${requiredClass}">${label} <span class="input-type">(array)</span></label>
                        ${description ? `<div class="input-description">${description}</div>` : ''}
                        <input type="text" name="${name}" data-input-type="array" value="${arrayValue}" placeholder="value1, value2, value3" ${required}>
                    </div>
                `;

            case 'object':
                const objectValue = typeof currentValue === 'object' && currentValue !== null
                    ? escapeHtml(JSON.stringify(currentValue, null, 2))
                    : '';
                return `
                    <div class="input-group">
                        <label class="input-label ${requiredClass}">${label} <span class="input-type">(object)</span></label>
                        ${description ? `<div class="input-description">${description}</div>` : ''}
                        <textarea name="${name}" data-input-type="object" placeholder="{}" ${required}>${objectValue}</textarea>
                    </div>
                `;

            default:
                const stringValue = escapeAttribute(String(currentValue || ''));
                return `
                    <div class="input-group">
                        <label class="input-label ${requiredClass}">${label} <span class="input-type">(string)</span></label>
                        ${description ? `<div class="input-description">${description}</div>` : ''}
                        <input type="text" name="${name}" data-input-type="string" value="${stringValue}" ${required}>
                    </div>
                `;
        }
    }
}
