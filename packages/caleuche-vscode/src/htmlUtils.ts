export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function escapeAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function getCommonStyles(): string {
    return `
        body {
            font-family: var(--vscode-editor-font-family, 'Consolas', 'Courier New', monospace);
            font-size: var(--vscode-editor-font-size, 14px);
            line-height: 1.5;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }

        .preview-container {
            max-width: 100%;
            overflow-x: auto;
        }

        pre {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
            padding: 16px;
            overflow-x: auto;
            margin: 0;
        }

        code {
            font-family: var(--vscode-editor-font-family, 'Consolas', 'Courier New', monospace);
            font-size: var(--vscode-editor-font-size, 14px);
        }

        h1, h2 {
            margin-top: 0;
            color: var(--vscode-editor-foreground);
        }

        .error {
            color: #f14c4c;
            background-color: rgba(241, 76, 76, 0.1);
            padding: 10px;
            border-radius: 3px;
            margin: 10px 0;
            border: 1px solid rgba(241, 76, 76, 0.3);
        }

        .loading {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
    `;
}

export async function generateSyntaxHighlightedHtml(code: string, language: string): Promise<string> {
    try {
        const { codeToHtml } = await import('shiki');
        
        const html = await codeToHtml(code, {
            lang: mapLanguageForShiki(language),
            theme: 'dark-plus',
            transformers: [{
                pre(node) {
                    this.addClassToHast(node, 'shiki-vscode');
                    if (node.properties.style) {
                        delete node.properties.style;
                    }
                }
            }]
        });
        
        return html;
    } catch (error) {
        console.error('Error generating syntax highlighting:', error);
        return `<pre><code>${escapeHtml(code)}</code></pre>`;
    }
}

export function getShikiIncludes(): string {
    return `
    <style>
        .shiki-vscode {
            background: var(--vscode-editor-background) !important;
            color: var(--vscode-editor-foreground) !important;
            margin: 0;
            padding: 16px;
            white-space: pre;
            overflow: visible;
            border: none;
            border-radius: 0;
        }
        
        .shiki-vscode code {
            background: transparent !important;
            color: inherit !important;
            white-space: pre;
        }
    </style>
    `;
}

export function getCommonJavaScript(): string {
    return `
        window.addEventListener('message', event => {
            try {
                const msg = event.data;
                if (msg.type === 'preview') {
                    const container = document.getElementById('preview-container');
                    if (container && msg.html) {
                        container.innerHTML = msg.html;
                        console.log('Updated preview with Shiki-highlighted content');
                    }
                }
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });
        
        console.log('Shiki preview initialized');
    `;
}

export function mapLanguageForShiki(languageId: string): string {
    const languageMap: { [key: string]: string } = {
        'typescript': 'typescript',
        'javascript': 'javascript',
        'python': 'python',
        'java': 'java',
        'csharp': 'csharp',
        'cpp': 'cpp',
        'c': 'c',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'yaml': 'yaml',
        'xml': 'xml',
        'markdown': 'markdown',
        'shell': 'bash',
        'powershell': 'powershell',
        'sql': 'sql',
        'go': 'go',
        'rust': 'rust',
        'php': 'php',
        'ruby': 'ruby'
    };

    return languageMap[languageId] || 'text';
}
