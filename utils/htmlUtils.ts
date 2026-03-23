
export const wrapInFullDocument = (content: string, title: string, metaDescription: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${metaDescription}">
    <style>
        :root {
            --primary: #2563eb;
            --text: #1f2937;
            --bg: #ffffff;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: var(--text);
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem;
            background-color: var(--bg);
        }
        h1 { font-size: 2.5rem; margin-bottom: 1.5rem; color: #111827; line-height: 1.2; }
        h2 { font-size: 1.8rem; margin-top: 2rem; margin-bottom: 1rem; color: #374151; }
        h3 { font-size: 1.4rem; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #4b5563; }
        p { margin-bottom: 1.25rem; }
        ul, ol { margin-bottom: 1.25rem; padding-left: 1.5rem; }
        li { margin-bottom: 0.5rem; }
        a { color: var(--primary); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
        a:hover { border-bottom-color: var(--primary); }
        .meta-box { background: #f3f4f6; padding: 1rem; border-radius: 4px; font-size: 0.9rem; margin-bottom: 2rem; border-left: 4px solid var(--primary); }
    </style>
</head>
<body>
    <article>
        ${content}
    </article>
</body>
</html>
  `.trim();
};

export const downloadAsHtml = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
