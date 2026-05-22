const DEFAULT_CURRENCY = 'INR';

function buildMonthlyReportData(options) {
  const currency = options.currency || DEFAULT_CURRENCY;
  const transactions = [...options.transactions].sort((first, second) => second.timestamp - first.timestamp);
  const incomeTransactions = transactions.filter((transaction) => transaction.type === 'income');
  const expenseTransactions = transactions.filter((transaction) => transaction.type === 'expense');
  const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  const summary = {
    totalIncome,
    totalExpense,
    netFlow: totalIncome - totalExpense,
    incomeCount: incomeTransactions.length,
    expenseCount: expenseTransactions.length,
    topCategory: 'No expenses yet',
    topCategoryAmount: 0,
    topWallet: 'No wallet yet',
  };

  const categoryTotals = new Map();
  expenseTransactions.forEach((transaction) => {
    const current = categoryTotals.get(transaction.categoryName) || { amount: 0, color: transaction.categoryColor };
    categoryTotals.set(transaction.categoryName, {
      amount: current.amount + transaction.amount,
      color: transaction.categoryColor || current.color,
    });
  });

  for (const [name, value] of categoryTotals.entries()) {
    if (value.amount > summary.topCategoryAmount) {
      summary.topCategory = name;
      summary.topCategoryAmount = value.amount;
    }
  }

  const walletsSorted = [...options.wallets].sort((first, second) => second.balance - first.balance);
  summary.topWallet = walletsSorted[0]?.name || summary.topWallet;
  const totalBalance = walletsSorted.reduce((sum, wallet) => sum + wallet.balance, 0) || 1;

  const wallets = walletsSorted.map((wallet) => ({
    name: wallet.name,
    balance: wallet.balance,
    share: wallet.balance / totalBalance,
    color: wallet.color,
  }));

  const categories = Array.from(categoryTotals.entries())
    .map(([name, value]) => ({
      name,
      amount: value.amount,
      share: value.amount / (totalExpense || 1),
      color: value.color,
    }))
    .sort((first, second) => second.amount - first.amount);

  const dailyMap = new Map();
  transactions.forEach((transaction) => {
    const date = new Date(transaction.timestamp);
    const dayKey = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const current = dailyMap.get(dayKey) || { label, income: 0, expense: 0, net: 0 };
    if (transaction.type === 'income') {
      current.income += transaction.amount;
    } else {
      current.expense += transaction.amount;
    }
    current.net = current.income - current.expense;
    dailyMap.set(dayKey, current);
  });

  const dailySeries = Array.from(dailyMap.entries())
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([, value]) => value);

  return {
    userName: options.userName,
    monthLabel: options.monthLabel,
    currency,
    summary,
    wallets,
    categories,
    dailySeries,
    transactions: transactions.map((transaction) => ({
      timestamp: transaction.timestamp,
      type: transaction.type,
      amount: transaction.amount,
      walletName: transaction.walletName,
      categoryName: transaction.categoryName,
      reason: transaction.reason,
      note: transaction.note,
    })),
  };
}

function formatReportMoney(value, currency = DEFAULT_CURRENCY) {
  return `${currency} ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value)}`;
}

function buildMonthlyReportEmailHtml(data) {
  const snapshots = buildMonthlyReportSvgSnapshots(data);
  const categoryRows = data.categories
    .map(
      (category) => `
        <tr><td>${escapeHtml(category.name)}</td><td>${formatReportMoney(category.amount, data.currency)}</td><td>${Math.round(category.share * 100)}%</td></tr>`
    )
    .join('');

  const walletRows = data.wallets
    .map(
      (wallet) => `
        <tr><td>${escapeHtml(wallet.name)}</td><td>${formatReportMoney(wallet.balance, data.currency)}</td><td>${Math.round(wallet.share * 100)}%</td></tr>`
    )
    .join('');

  const transactionRows = data.transactions
    .slice(0, 30)
    .map((transaction) => {
      const sign = transaction.type === 'income' ? '+' : '-';
      return `
        <tr>
          <td>${new Date(transaction.timestamp).toLocaleString('en-IN')}</td>
          <td>${escapeHtml(transaction.reason)}</td>
          <td>${escapeHtml(transaction.categoryName)}</td>
          <td>${escapeHtml(transaction.walletName)}</td>
          <td>${sign}${formatReportMoney(transaction.amount, data.currency)}</td>
        </tr>`;
    })
      .join('');

  return `
    <html>
      <body style="font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;padding:24px">
        <h1>Monthly report - ${escapeHtml(data.monthLabel)}</h1>
        <p>Hello ${escapeHtml(data.userName)}, here is your monthly summary.</p>
        <p><strong>Income:</strong> ${formatReportMoney(data.summary.totalIncome, data.currency)} | <strong>Expense:</strong> ${formatReportMoney(data.summary.totalExpense, data.currency)} | <strong>Net:</strong> ${formatReportMoney(data.summary.netFlow, data.currency)}</p>
        <h2>Graph snapshots</h2>
        <div style="display:grid;gap:16px">${snapshots.categoryChart}${snapshots.dailyChart}</div>
        <h2>Wallet balances</h2>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%">
          <thead><tr><th align="left">Wallet</th><th align="left">Balance</th><th align="left">Share</th></tr></thead>
          <tbody>${walletRows}</tbody>
        </table>
        <h2>Category analysis</h2>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%">
          <thead><tr><th align="left">Category</th><th align="left">Amount</th><th align="left">Share</th></tr></thead>
          <tbody>${categoryRows}</tbody>
        </table>
        <h2>Detailed transaction table</h2>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%">
          <thead><tr><th align="left">Date</th><th align="left">Reason</th><th align="left">Category</th><th align="left">Wallet</th><th align="left">Amount</th></tr></thead>
          <tbody>${transactionRows}</tbody>
        </table>
      </body>
    </html>
  `;
}

function buildMonthlyReportSvgSnapshots(data) {
  return {
    categoryChart: buildBarChartSvg(
      'Category analysis',
      data.categories.map((category) => ({ label: category.name, value: category.amount, color: category.color }))
    ),
    dailyChart: buildBarChartSvg(
      'Daily net flow',
      data.dailySeries.map((point) => ({
        label: point.label,
        value: Math.abs(point.net),
        color: point.net >= 0 ? '#10B981' : '#EF4444',
      }))
    ),
  };
}

function buildMonthlyReportPdfBytes(data) {
  const pages = [buildSummaryPage(data)];
  pages.push(...buildTransactionPages(data));
  return buildPdfDocument(pages);
}

function buildMonthlyReportXlsxBytes(data) {
  const files = new Map();
  files.set('[Content_Types].xml', textFile(buildContentTypesXml()));
  files.set('_rels/.rels', textFile(buildRootRelsXml()));
  files.set('xl/workbook.xml', textFile(buildWorkbookXml()));
  files.set('xl/_rels/workbook.xml.rels', textFile(buildWorkbookRelsXml()));
  files.set('xl/styles.xml', textFile(buildStylesXml()));
  files.set('xl/worksheets/sheet1.xml', textFile(buildSheetXml([
    ['Month', data.monthLabel],
    ['User', data.userName],
    ['Income', String(data.summary.totalIncome)],
    ['Expense', String(data.summary.totalExpense)],
    ['Net flow', String(data.summary.netFlow)],
    ['Top category', data.summary.topCategory],
    ['Top wallet', data.summary.topWallet],
  ])));
  files.set('xl/worksheets/sheet2.xml', textFile(buildSheetXml([['Wallet', 'Balance', 'Share'], ...data.wallets.map((wallet) => [wallet.name, String(wallet.balance), `${Math.round(wallet.share * 100)}%`])])));
  files.set('xl/worksheets/sheet3.xml', textFile(buildSheetXml([['Category', 'Amount', 'Share'], ...data.categories.map((category) => [category.name, String(category.amount), `${Math.round(category.share * 100)}%`])])));
  files.set('xl/worksheets/sheet4.xml', textFile(buildSheetXml([
    ['Date', 'Type', 'Amount', 'Category', 'Wallet', 'Reason', 'Note'],
    ...data.transactions.map((transaction) => [
      new Date(transaction.timestamp).toLocaleString('en-IN'),
      transaction.type,
      String(transaction.amount),
      transaction.categoryName,
      transaction.walletName,
      transaction.reason,
      transaction.note || '',
    ]),
  ])));
  files.set('xl/worksheets/sheet5.xml', textFile(buildSheetXml([['Day', 'Income', 'Expense', 'Net'], ...data.dailySeries.map((point) => [point.label, String(point.income), String(point.expense), String(point.net)])])));
  return createZip(files);
}

function getMonthWindow(referenceDate, timeZone) {
  const { year, month } = getZonedYearMonth(referenceDate, timeZone);
  const previousMonth = month - 1;
  const previousYear = previousMonth === 0 ? year - 1 : year;
  const monthIndex = previousMonth === 0 ? 11 : previousMonth - 1;
  const start = zonedDateToUtc(previousYear, monthIndex, 1, 0, 0, 0, timeZone);
  const end = zonedDateToUtc(year, month - 1, 1, 0, 0, 0, timeZone);
  return { start, end, monthLabel: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone }).format(new Date(start)) };
}

function getZonedYearMonth(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric' }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value || '1970');
  const month = Number(parts.find((part) => part.type === 'month')?.value || '1');
  return { year, month };
}

function zonedDateToUtc(year, monthIndex, day, hour, minute, second, timeZone) {
  let utcGuess = Date.UTC(year, monthIndex, day, hour, minute, second);
  for (let index = 0; index < 4; index += 1) {
    const offset = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
    const nextGuess = Date.UTC(year, monthIndex, day, hour, minute, second) - offset * 60000;
    if (Math.abs(nextGuess - utcGuess) < 1000) {
      return nextGuess;
    }
    utcGuess = nextGuess;
  }
  return utcGuess;
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value || '1970');
  const month = Number(parts.find((part) => part.type === 'month')?.value || '1');
  const day = Number(parts.find((part) => part.type === 'day')?.value || '1');
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  const second = Number(parts.find((part) => part.type === 'second')?.value || '0');
  return (Date.UTC(year, month - 1, day, hour, minute, second) - date.getTime()) / 60000;
}

function getTransactionsForWindow(transactions, timeZone) {
  const { start, end, monthLabel } = getMonthWindow(new Date(), timeZone);
  return {
    monthLabel,
    start,
    end,
    transactions: transactions.filter((transaction) => transaction.timestamp >= start && transaction.timestamp < end),
  };
}

function buildSummaryPage(data) {
  return [
    textLine(40, 800, 20, `Monthly report - ${data.monthLabel}`),
    textLine(40, 772, 11, `User: ${data.userName}`),
    textLine(40, 754, 11, `Income: ${formatReportMoney(data.summary.totalIncome, data.currency)}   Expense: ${formatReportMoney(data.summary.totalExpense, data.currency)}   Net: ${formatReportMoney(data.summary.netFlow, data.currency)}`),
  ].join('\n');
}

function buildTransactionPages(data) {
  const pages = [];
  const columns = [
    { label: 'Date', width: 64, align: 'left' },
    { label: 'Type', width: 42, align: 'left' },
    { label: 'Amount', width: 66, align: 'right' },
    { label: 'Wallet', width: 66, align: 'left' },
    { label: 'Category', width: 78, align: 'left' },
    { label: 'Reason', width: 129, align: 'left' },
    { label: 'Note', width: 70, align: 'left' },
  ];

  if (!data.transactions.length) {
    const ops = [];
    ops.push(textLine(40, 800, 18, 'Transactions'));
    ops.push(textLine(40, 764, 11, 'No transactions for this period.'));
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

function buildTransactionPage(data, rows, pageNumber) {
  const lines = [textLine(40, 800, 18, `Transactions - page ${pageNumber}`)];
  let y = 770;
  rows.forEach((transaction) => {
    const card = buildTransactionCard(transaction, data.currency, y);
    lines.push(card.ops);
    y = card.nextY - 12;
  });
  return lines.join('\n');
}

function createTransactionPageHeader(pageNumber) {
  const ops = [];
  let y = 800;
  ops.push(textBoldLine(40, y, 18, `Transactions - page ${pageNumber}`));
  y -= 22;
  ops.push(textLine(40, y, 10, 'Table view keeps every field aligned while wrapping long text inside each cell.'));
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
    ops.push(textBoldLine(x + 4, y - 10, 9, header.label));
    x += header.width;
  });

  return ops;
}

function buildTransactionRow(transaction, currency, columns) {
  const cellValues = [
    new Date(transaction.timestamp).toLocaleDateString('en-IN'),
    transaction.type,
    `${transaction.type === 'income' ? '+' : '-'}${formatReportMoney(transaction.amount, currency)}`,
    transaction.walletName,
    transaction.categoryName,
    transaction.reason,
    transaction.note || '',
  ];

  const cellLines = cellValues.map((value, index) => {
    const fontSize = index === 2 ? 8.2 : 8;
    const maxChars = estimateChars(columns[index].width, fontSize);
    return wrapText(value, maxChars);
  });
  const rowHeight = 10 + Math.max(...cellLines.map((lines) => lines.length)) * 11 + 8;
  return { cellLines, rowHeight };
}

function drawTransactionRow(ops, x, topY, columns, row) {
  let currentX = x;
  const bottomY = topY - row.rowHeight;
  columns.forEach((column, index) => {
    ops.push(`${currentX} ${bottomY} ${column.width} ${row.rowHeight} re S`);
    const lines = row.cellLines[index];
    const fontSize = index === 2 ? 8.2 : 8;
    const startX = column.align === 'right'
      ? Math.max(currentX + 4, currentX + column.width - 4 - estimateTextWidth(lines[0] || '', fontSize))
      : currentX + 4;
    lines.forEach((line, lineIndex) => {
      const lineY = topY - 13 - lineIndex * 11;
      ops.push(textLine(startX, lineY, fontSize, line));
    });
    currentX += column.width;
  });
  return bottomY;
}

function buildTransactionCard(transaction, currency, topY) {
  const contentLines = [
    `Amount: ${transaction.type === 'income' ? '+' : '-'}${formatReportMoney(transaction.amount, currency)}`,
    `Date: ${new Date(transaction.timestamp).toLocaleDateString('en-IN')}`,
    `Type: ${transaction.type}`,
    `Wallet: ${transaction.walletName}`,
    `Category: ${transaction.categoryName}`,
    ...wrapText(`Reason: ${transaction.reason}`, 46),
    ...(transaction.note ? wrapText(`Note: ${transaction.note}`, 46) : []),
  ];
  const lineHeight = 12;
  const cardPadding = 10;
  const cardHeight = cardPadding * 2 + contentLines.length * lineHeight + 4;
  const bottomY = topY - cardHeight;
  const ops = [];
  ops.push(`${40} ${bottomY} ${515} ${cardHeight} re S`);
  let textY = topY - 18;
  contentLines.forEach((line, index) => {
    ops.push(textLine(50, textY - index * lineHeight, index === 0 ? 10 : 8.2, line));
  });
  return { ops: ops.join('\n'), nextY: bottomY };
}

function buildPdfDocument(pages) {
  const encoder = new TextEncoder();
  const header = encoder.encode('%PDF-1.4\n');
  const objectCount = 2 + 1 + pages.length * 2;
  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;
  const boldFontId = 4;
  const contentStartId = 5;
  const pageStartId = contentStartId + pages.length;
  const bodies = new Map();
  bodies.set(fontId, encodeObject(encoder, fontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'));
  bodies.set(boldFontId, encodeObject(encoder, boldFontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'));
  bodies.set(pagesId, encodeObject(encoder, pagesId, `<< /Type /Pages /Kids [ ${Array.from({ length: pages.length }, (_, index) => `${pageStartId + index} 0 R`).join(' ')} ] /Count ${pages.length} >>`));
  bodies.set(catalogId, encodeObject(encoder, catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`));
  pages.forEach((content, index) => {
    const contentId = contentStartId + index;
    const pageId = pageStartId + index;
    bodies.set(contentId, encodeObject(encoder, contentId, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`));
    bodies.set(pageId, encodeObject(encoder, pageId, `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  });
  const ordered = [];
  const offsets = new Array(objectCount + 1).fill(0);
  let position = header.length;
  for (let id = 1; id <= objectCount; id += 1) {
    const body = bodies.get(id);
    if (!body) throw new Error(`Missing PDF object ${id}`);
    offsets[id] = position;
    ordered.push(body);
    position += body.length;
  }
  const body = concatUint8Arrays(ordered);
  const xrefStart = header.length + body.length;
  const xrefLines = ['xref', `0 ${objectCount + 1}`, '0000000000 65535 f '];
  for (let id = 1; id <= objectCount; id += 1) {
    xrefLines.push(`${String(offsets[id]).padStart(10, '0')} 00000 n `);
  }
  const trailer = `trailer\n<< /Size ${objectCount + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return concatUint8Arrays([header, body, encoder.encode(`${xrefLines.join('\n')}\n${trailer}`)]);
}

function encodeObject(encoder, objectId, body) {
  return encoder.encode(`${objectId} 0 obj\n${body}\nendobj\n`);
}

function buildContentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet5.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
}

function buildRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}

function buildWorkbookXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Summary" sheetId="1" r:id="rId1"/><sheet name="Wallets" sheetId="2" r:id="rId2"/><sheet name="Categories" sheetId="3" r:id="rId3"/><sheet name="Transactions" sheetId="4" r:id="rId4"/><sheet name="Daily Flow" sheetId="5" r:id="rId5"/></sheets></workbook>`;
}

function buildWorkbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet5.xml"/></Relationships>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`;
}

function buildSheetXml(rows) {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, cellIndex) => {
          const ref = `${columnName(cellIndex + 1)}${rowIndex + 1}`;
          if (isNumeric(value) && rowIndex > 0) {
            return `<c r="${ref}"><v>${value}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
}

function textFile(value) {
  return new TextEncoder().encode(value);
}

function createZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const [name, content] of files.entries()) {
    const nameBytes = encoder.encode(name);
    const crc = crc32(content);
    const localHeader = createLocalHeader(nameBytes, crc, content.length);
    localParts.push(localHeader, nameBytes, content);
    centralParts.push(createCentralHeader(nameBytes, crc, content.length, offset), nameBytes);
    offset += localHeader.length + nameBytes.length + content.length;
  }
  const centralDirectory = concatUint8Arrays(centralParts);
  const endRecord = createEndRecord(files.size, centralDirectory.length, offset);
  return concatUint8Arrays([...localParts, centralDirectory, endRecord]);
}

function createLocalHeader(nameBytes, crc, size) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  return header;
}

function createCentralHeader(nameBytes, crc, size, offset) {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  return header;
}

function createEndRecord(entryCount, directorySize, directoryOffset) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, directorySize, true);
  view.setUint32(16, directoryOffset, true);
  view.setUint16(20, 0, true);
  return record;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function buildBarChartSvg(title, items) {
  const width = 680;
  const height = 220;
  const chartHeight = 120;
  const leftPadding = 40;
  const topPadding = 44;
  const barWidth = Math.max(18, Math.min(40, (width - leftPadding * 2) / Math.max(items.length, 1) - 8));
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const bars = items
    .map((item, index) => {
      const x = leftPadding + index * (barWidth + 8);
      const barHeight = Math.max(4, (item.value / maxValue) * chartHeight);
      const y = topPadding + (chartHeight - barHeight);
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${item.color}"/><text x="${x + barWidth / 2}" y="${topPadding + chartHeight + 16}" text-anchor="middle" font-size="10" fill="#475569">${escapeXml(item.label.length > 10 ? `${item.label.slice(0, 10)}…` : item.label)}</text>`;
    })
    .join('');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="16" fill="#ffffff" stroke="#cbd5e1"/><text x="24" y="28" font-size="16" font-weight="700" fill="#0f172a">${escapeXml(title)}</text><line x1="${leftPadding}" y1="${topPadding + chartHeight}" x2="${width - leftPadding}" y2="${topPadding + chartHeight}" stroke="#cbd5e1" />${bars}</svg>`;
}

function textLine(x, y, size, text) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function textBoldLine(x, y, size, text) {
  return `BT /F2 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function wrapText(value, maxLength) {
  const words = String(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [String(value).slice(0, maxLength)];
}

function estimateChars(width, fontSize) {
  return Math.max(8, Math.floor(width / (fontSize * 0.55)));
}

function estimateTextWidth(value, fontSize) {
  return Math.ceil(String(value).length * fontSize * 0.55);
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function escapeXml(value) {
  return escapeHtml(value);
}

function escapePdfText(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function columnName(index) {
  let current = index;
  let name = '';
  while (current > 0) {
    current -= 1;
    name = String.fromCharCode(65 + (current % 26)) + name;
    current = Math.floor(current / 26);
  }
  return name;
}

function isNumeric(value) {
  return /^-?\d+(\.\d+)?$/.test(value);
}

function concatUint8Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });
  return merged;
}

function getPreviousMonthWindow(referenceDate, timeZone) {
  const { year, month } = getZonedYearMonth(referenceDate, timeZone);
  const currentMonthStart = zonedDateToUtc(year, month - 1, 1, 0, 0, 0, timeZone);
  const previousMonthDate = new Date(currentMonthStart - 1);
  const previous = getZonedYearMonth(previousMonthDate, timeZone);
  const start = zonedDateToUtc(previous.year, previous.month - 1, 1, 0, 0, 0, timeZone);
  const end = currentMonthStart;
  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone }).format(new Date(start));
  return { start, end, monthLabel };
}

function getZonedYearMonth(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric' }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value || '1970');
  const month = Number(parts.find((part) => part.type === 'month')?.value || '1');
  return { year, month };
}

function zonedDateToUtc(year, monthIndex, day, hour, minute, second, timeZone) {
  let utcGuess = Date.UTC(year, monthIndex, day, hour, minute, second);
  for (let index = 0; index < 4; index += 1) {
    const offset = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
    const nextGuess = Date.UTC(year, monthIndex, day, hour, minute, second) - offset * 60000;
    if (Math.abs(nextGuess - utcGuess) < 1000) {
      return nextGuess;
    }
    utcGuess = nextGuess;
  }
  return utcGuess;
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value || '1970');
  const month = Number(parts.find((part) => part.type === 'month')?.value || '1');
  const day = Number(parts.find((part) => part.type === 'day')?.value || '1');
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  const second = Number(parts.find((part) => part.type === 'second')?.value || '0');
  return (Date.UTC(year, month - 1, day, hour, minute, second) - date.getTime()) / 60000;
}

module.exports = {
  buildMonthlyReportData,
  buildMonthlyReportEmailHtml,
  buildMonthlyReportSvgSnapshots,
  buildMonthlyReportPdfBytes,
  buildMonthlyReportXlsxBytes,
  formatReportMoney,
  getPreviousMonthWindow,
  getTransactionsForWindow: function getTransactionsForWindow(transactions, timeZone) {
    const window = getPreviousMonthWindow(new Date(), timeZone);
    return {
      monthLabel: window.monthLabel,
      start: window.start,
      end: window.end,
      transactions: transactions.filter((transaction) => transaction.timestamp >= window.start && transaction.timestamp < window.end),
    };
  },
};
