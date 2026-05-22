import { MonthlyReportOptions, buildMonthlyReportData, formatReportMoney } from './monthly-report';

export async function generateMonthlyReportPdf(options: MonthlyReportOptions): Promise<Uint8Array> {
  const data = buildMonthlyReportData(options);
  return buildMonthlyReportPdfBytes(data);
}

function buildMonthlyReportPdfBytes(data: ReturnType<typeof buildMonthlyReportData>) {
  const pages: string[] = [];
  pages.push(buildSummaryPage(data));
  pages.push(...buildTransactionPages(data));

  return buildPdfDocument(pages);
}

function buildSummaryPage(data: ReturnType<typeof buildMonthlyReportData>) {
  const ops: string[] = [];
  let y = 800;
  text(ops, 40, y, 20, `Monthly report - ${data.monthLabel}`);
  y -= 28;
  text(ops, 40, y, 11, `User: ${data.userName}`);
  y -= 18;
  text(ops, 40, y, 11, `Income: ${formatReportMoney(data.summary.totalIncome, data.currency)}   Expense: ${formatReportMoney(data.summary.totalExpense, data.currency)}   Net: ${formatReportMoney(data.summary.netFlow, data.currency)}`);

  y -= 36;
  text(ops, 40, y, 14, 'Wallet balances');
  y -= 12;
  drawTable(ops, 40, y - 8, 515, 18, ['Wallet', 'Balance', 'Share'], data.wallets.map((wallet) => [
    wallet.name,
    formatReportMoney(wallet.balance, data.currency),
    `${Math.round(wallet.share * 100)}%`,
  ]));
  y -= 18 + data.wallets.length * 18 + 24;

  text(ops, 40, y, 14, 'Category analysis');
  y -= 12;
  drawTable(ops, 40, y - 8, 515, 18, ['Category', 'Amount', 'Share'], data.categories.map((category) => [
    category.name,
    formatReportMoney(category.amount, data.currency),
    `${Math.round(category.share * 100)}%`,
  ]));

  y -= 18 + data.categories.length * 18 + 30;
  text(ops, 40, y, 14, 'Graph snapshots');
  y -= 18;
  drawBarChart(ops, 40, y - 160, 515, 140, 'Category analysis', data.categories.map((category) => ({
    label: category.name,
    value: category.amount,
    color: category.color,
  })));

  y -= 180;
  drawBarChart(ops, 40, y - 160, 515, 140, 'Daily net flow', data.dailySeries.map((point) => ({
    label: point.label,
    value: Math.abs(point.net),
    color: point.net >= 0 ? '#10B981' : '#EF4444',
  })));

  return ops.join('\n');
}

function buildTransactionPages(data: ReturnType<typeof buildMonthlyReportData>) {
  const pages: string[] = [];
  const columns = [
    { label: 'Date', width: 64, align: 'left' as const },
    { label: 'Type', width: 42, align: 'left' as const },
    { label: 'Amount', width: 66, align: 'right' as const },
    { label: 'Wallet', width: 66, align: 'left' as const },
    { label: 'Category', width: 78, align: 'left' as const },
    { label: 'Reason', width: 129, align: 'left' as const },
    { label: 'Note', width: 70, align: 'left' as const },
  ];

  if (!data.transactions.length) {
    const ops: string[] = [];
    text(ops, 40, 800, 18, 'Transactions');
    text(ops, 40, 764, 11, 'No transactions for this period.');
    pages.push(ops.join('\n'));
    return pages;
  }

  let pageNumber = 1;
  let ops = createTransactionPageHeader(pageNumber);
  let y = 720;
  const bottomLimit = 72;

  data.transactions.forEach((transaction, index) => {
    const row = buildTransactionRow(transaction, data.currency, columns);
    if (y - row.rowHeight < bottomLimit) {
      pages.push(ops.join('\n'));
      pageNumber += 1;
      ops = createTransactionPageHeader(pageNumber);
      y = 720;
    }

    y = drawTransactionRow(ops, 40, y, columns, row) - 6;

    if (index === data.transactions.length - 1) {
      pages.push(ops.join('\n'));
    }
  });

  return pages;
}

function createTransactionPageHeader(pageNumber: number) {
  const ops: string[] = [];
  let y = 800;
  textBold(ops, 40, y, 18, `Transactions - page ${pageNumber}`);
  y -= 22;
  text(ops, 40, y, 10, 'Table view keeps every field aligned while wrapping long text inside each cell.');
  y -= 24;

  const headers = [
    { label: 'Date', width: 64 },
    { label: 'Type', width: 42 },
    { label: 'Amount', width: 66 },
    { label: 'Wallet', width: 66 },
    { label: 'Category', width: 78 },
    { label: 'Reason', width: 129 },
    { label: 'Note', width: 70 },
  ];

  let x = 40;
  headers.forEach((header) => {
    ops.push(`${x} ${y - 18} ${header.width} 18 re S`);
    textBold(ops, x + 4, y - 10, 9, header.label);
    x += header.width;
  });

  return ops;
}

function buildTransactionRow(
  transaction: ReturnType<typeof buildMonthlyReportData>['transactions'][number],
  currency: string,
  columns: { label: string; width: number; align: 'left' | 'right' }[]
) {
  const cellValues = [
    new Date(transaction.timestamp).toLocaleDateString('en-IN'),
    transaction.type,
    `${transaction.type === 'income' ? '+' : '-'}${formatReportMoney(transaction.amount, currency)}`,
    transaction.walletName,
    transaction.categoryName,
    transaction.reason,
    transaction.note ?? '',
  ];

  const cellLines = cellValues.map((value, index) => {
    const fontSize = index === 2 ? 8.2 : 8;
    const maxChars = estimateChars(columns[index].width, fontSize);
    return wrapText(value, maxChars);
  });
  const rowHeight = 10 + Math.max(...cellLines.map((lines) => lines.length)) * 11 + 8;
  return { cellLines, rowHeight };
}

function drawTransactionRow(
  ops: string[],
  x: number,
  topY: number,
  columns: { label: string; width: number; align: 'left' | 'right' }[],
  row: ReturnType<typeof buildTransactionRow>
) {
  let currentX = x;
  const bottomY = topY - row.rowHeight;
  columns.forEach((column, index) => {
    ops.push(`${currentX} ${bottomY} ${column.width} ${row.rowHeight} re S`);
    const lines = row.cellLines[index];
    const fontSize = index === 2 ? 8.2 : 8;
    const startX = column.align === 'right'
      ? Math.max(currentX + 4, currentX + column.width - 4 - estimateTextWidth(lines[0] ?? '', fontSize))
      : currentX + 4;
    lines.forEach((line, lineIndex) => {
      const lineY = topY - 13 - lineIndex * 11;
      text(ops, startX, lineY, fontSize, line);
    });
    currentX += column.width;
  });
  return bottomY;
}

function drawTable(
  ops: string[],
  x: number,
  y: number,
  width: number,
  rowHeight: number,
  headers: string[],
  rows: string[][],
  columnWidths?: number[]
) {
  const widths = columnWidths ?? headers.map(() => width / headers.length);
  let currentY = y;
  drawRow(ops, x, currentY, widths, rowHeight, headers, true);
  currentY -= rowHeight;
  for (const row of rows) {
    drawRow(ops, x, currentY, widths, rowHeight, row, false);
    currentY -= rowHeight;
  }
}

function drawRow(
  ops: string[],
  x: number,
  y: number,
  widths: number[],
  rowHeight: number,
  values: string[],
  header: boolean
) {
  let currentX = x;
  values.forEach((value, index) => {
    const width = widths[index] ?? widths[widths.length - 1];
    ops.push(`${currentX} ${y} ${width} ${rowHeight} re S`);
    text(ops, currentX + 4, y + rowHeight - 12, header ? 10 : 9, value);
    currentX += width;
  });
}

function estimateChars(width: number, fontSize: number) {
  return Math.max(8, Math.floor(width / (fontSize * 0.55)));
}

function estimateTextWidth(value: string, fontSize: number) {
  return Math.ceil(String(value).length * fontSize * 0.55);
}

function drawBarChart(
  ops: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  items: { label: string; value: number; color: string }[]
) {
  const chartTop = y + height - 24;
  text(ops, x, chartTop + 8, 11, title);
  ops.push(`${x} ${y} ${width} ${height} re S`);
  const barAreaHeight = height - 36;
  const barWidth = Math.max(10, Math.min(22, (width - 24) / Math.max(items.length, 1) - 4));
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  items.forEach((item, index) => {
    const barHeight = Math.max(4, (item.value / maxValue) * (barAreaHeight - 16));
    const barX = x + 12 + index * (barWidth + 4);
    const barY = y + 8 + (barAreaHeight - barHeight);
    ops.push(`${hexToRgbOps(item.color)} rg`);
    ops.push(`${barX} ${barY} ${barWidth} ${barHeight} re f`);
    ops.push(`0 0 0 rg`);
    text(ops, barX - 2, y + 4, 6, truncate(item.label, 10));
  });
}

function text(ops: string[], x: number, y: number, fontSize: number, value: string) {
  ops.push(`BT /F1 ${fontSize} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`);
}

function textBold(ops: string[], x: number, y: number, fontSize: number, value: string) {
  ops.push(`BT /F2 ${fontSize} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`);
}

function buildPdfDocument(pageContents: string[]) {
  const encoder = new TextEncoder();
  const header = encoder.encode('%PDF-1.4\n');
  const nextId = { value: 1 };
  const catalogId = nextId.value++;
  const pagesId = nextId.value++;
  const fontId = nextId.value++;
  const boldFontId = nextId.value++;
  const contentIds = pageContents.map(() => nextId.value++);
  const pageIds = pageContents.map(() => nextId.value++);
  const maxObjectId = nextId.value - 1;

  const objectBodies = new Map<number, Uint8Array>();
  objectBodies.set(fontId, encodeObject(encoder, fontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'));
  objectBodies.set(boldFontId, encodeObject(encoder, boldFontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'));
  objectBodies.set(
    pagesId,
    encodeObject(
      encoder,
      pagesId,
      `<< /Type /Pages /Kids [ ${pageIds.map((pageId) => `${pageId} 0 R`).join(' ')} ] /Count ${pageIds.length} >>`
    )
  );
  objectBodies.set(catalogId, encodeObject(encoder, catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`));

  pageContents.forEach((content, index) => {
    const contentObjectId = contentIds[index];
    const pageObjectId = pageIds[index];
    objectBodies.set(
      contentObjectId,
      encodeObject(encoder, contentObjectId, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`)
    );
    objectBodies.set(
      pageObjectId,
      encodeObject(
        encoder,
        pageObjectId,
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`
      )
    );
  });

  const objectOrder: Uint8Array[] = [];
  const offsets = new Array<number>(maxObjectId + 1).fill(0);
  let position = header.length;
  for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
    const body = objectBodies.get(objectId);
    if (!body) {
      throw new Error(`Missing PDF object ${objectId}`);
    }
    offsets[objectId] = position;
    objectOrder.push(body);
    position += body.length;
  }

  const body = concatUint8Arrays(objectOrder);
  const xrefStart = header.length + body.length;
  const xrefLines = ['xref', `0 ${maxObjectId + 1}`, '0000000000 65535 f '];
  for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
    xrefLines.push(`${offsets[objectId].toString().padStart(10, '0')} 00000 n `);
  }
  const trailer = `trailer\n<< /Size ${maxObjectId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return concatUint8Arrays([header, body, encoder.encode(`${xrefLines.join('\n')}\n${trailer}`)]);
}

function encodeObject(encoder: TextEncoder, objectId: number, body: string) {
  return encoder.encode(`${objectId} 0 obj\n${body}\nendobj\n`);
}

function hexToRgbOps(hex: string) {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  return `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)}`;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function wrapText(value: string, maxLength: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxLength) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [value.slice(0, maxLength)];
}

function escapePdfText(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function concatUint8Arrays(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });
  return merged;
}
