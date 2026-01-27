const clampFontSize = (value: number, min = 8, max = 24) => Math.min(max, Math.max(min, value));

const applyInlineFormatting = (content: string) => {
  let formatted = content;

  formatted = formatted.replace(/\[\[B\]\]([\s\S]*?)\[\[\/B\]\]/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\[\[I\]\]([\s\S]*?)\[\[\/I\]\]/g, '<em>$1</em>');
  formatted = formatted.replace(/\[\[U\]\]([\s\S]*?)\[\[\/U\]\]/g, '<span style="text-decoration: underline;">$1</span>');
  formatted = formatted.replace(/\[\[SIZE=(\d{1,2})\]\]([\s\S]*?)\[\[\/SIZE\]\]/g, (_match, size, inner) => {
    const safeSize = clampFontSize(Number.parseInt(size, 10));
    return `<span style="font-size: ${safeSize}pt;">${inner}</span>`;
  });

  return formatted;
};

export const formatDocumentContent = (content: string) => {
  if (!content) return '';

  let formatted = content;

  // Escape raw HTML
  formatted = formatted.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Parse TABLO tag
  // Format: [[TABLO:COLS=Ad|Soyad # ROWS=Ahmet|Yılmaz;Mehmet|Demir]]
  formatted = formatted.replace(/\[\[TABLO:(.*?)\]\]/g, (match, inner) => {
    try {
      const [colsPart, rowsPart] = inner.split(' # ');
      if (!colsPart || !rowsPart) return match;

      const headers = colsPart.replace('COLS=', '').split('|');
      const rows = rowsPart.replace('ROWS=', '').split(';');

      const styles = {
        table: 'width: 100%; border-collapse: collapse; margin: 1em 0; font-family: inherit; font-size: 10pt; color: #000; background-color: #fff;',
        th: 'border: 1px solid #000; padding: 4px 8px; text-align: left; font-weight: bold; background-color: #f8fafc; color: #000;',
        td: 'border: 1px solid #000; padding: 4px 8px; text-align: left; background-color: #fff; color: #000;'
      };

      const headerCells = headers.map((h: string) => `<th style="${styles.th}">${h}</th>`).join('');

      const tableRows = rows.map((rowStr: string) => {
        const cells = rowStr.split('|');
        const valueCells = cells.map((v: string) => `<td style="${styles.td}">${v}</td>`).join('');
        return `<tr>${valueCells}</tr>`;
      }).join('');

      return `<table style="${styles.table}"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>`;
    } catch (e) {
      console.error('Table parsing error:', e);
      return match;
    }
  });

  formatted = applyInlineFormatting(formatted);

  // Convert newlines to breaks
  formatted = formatted.replace(/\n/g, '<br/>');

  return formatted;
};

export const stripInlineFormatting = (content: string) => {
  if (!content) return '';
  return content
    .replace(/\[\[B\]\]/g, '')
    .replace(/\[\[\/B\]\]/g, '')
    .replace(/\[\[I\]\]/g, '')
    .replace(/\[\[\/I\]\]/g, '')
    .replace(/\[\[U\]\]/g, '')
    .replace(/\[\[\/U\]\]/g, '')
    .replace(/\[\[SIZE=\d{1,2}\]\]/g, '')
    .replace(/\[\[\/SIZE\]\]/g, '');
};
