import { MonthlyReportOptions, buildMonthlyReportData } from './monthly-report';

export async function generateMonthlyReportExcel(options: MonthlyReportOptions): Promise<Uint8Array> {
  const data = buildMonthlyReportData(options);
  return buildWorkbookBytes(data);
}

function buildWorkbookBytes(data: ReturnType<typeof buildMonthlyReportData>) {
  const files = new Map<string, Uint8Array>();
  files.set('[Content_Types].xml', textFile(buildContentTypesXml()));
  files.set('_rels/.rels', textFile(buildRootRelsXml()));
  files.set('xl/workbook.xml', textFile(buildWorkbookXml()));
  files.set('xl/_rels/workbook.xml.rels', textFile(buildWorkbookRelsXml()));
  files.set('xl/styles.xml', textFile(buildStylesXml()));
  files.set('xl/worksheets/sheet1.xml', textFile(buildSummarySheetXml(data)));
  files.set('xl/worksheets/sheet2.xml', textFile(buildWalletSheetXml(data)));
  files.set('xl/worksheets/sheet3.xml', textFile(buildCategorySheetXml(data)));
  files.set('xl/worksheets/sheet4.xml', textFile(buildTransactionsSheetXml(data)));
  files.set('xl/worksheets/sheet5.xml', textFile(buildDailySheetXml(data)));
  return createZip(files);
}

function buildContentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet5.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

function buildRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function buildWorkbookXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Summary" sheetId="1" r:id="rId1"/>
    <sheet name="Wallets" sheetId="2" r:id="rId2"/>
    <sheet name="Categories" sheetId="3" r:id="rId3"/>
    <sheet name="Transactions" sheetId="4" r:id="rId4"/>
    <sheet name="Daily Flow" sheetId="5" r:id="rId5"/>
  </sheets>
</workbook>`;
}

function buildWorkbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet5.xml"/>
</Relationships>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`;
}

function buildSummarySheetXml(data: ReturnType<typeof buildMonthlyReportData>) {
  const rows = [
    ['Month', data.monthLabel],
    ['User', data.userName],
    ['Income', data.summary.totalIncome.toString()],
    ['Expense', data.summary.totalExpense.toString()],
    ['Net flow', data.summary.netFlow.toString()],
    ['Top category', data.summary.topCategory],
    ['Top wallet', data.summary.topWallet],
  ];
  return buildSheetXml(rows);
}

function buildWalletSheetXml(data: ReturnType<typeof buildMonthlyReportData>) {
  const rows = [['Wallet', 'Balance', 'Share'], ...data.wallets.map((wallet) => [wallet.name, wallet.balance.toString(), `${Math.round(wallet.share * 100)}%`])];
  return buildSheetXml(rows);
}

function buildCategorySheetXml(data: ReturnType<typeof buildMonthlyReportData>) {
  const rows = [['Category', 'Amount', 'Share'], ...data.categories.map((category) => [category.name, category.amount.toString(), `${Math.round(category.share * 100)}%`])];
  return buildSheetXml(rows);
}

function buildTransactionsSheetXml(data: ReturnType<typeof buildMonthlyReportData>) {
  const rows = [
    ['Date', 'Type', 'Amount', 'Category', 'Wallet', 'Reason', 'Note'],
    ...data.transactions.map((transaction) => [
      new Date(transaction.timestamp).toLocaleString('en-IN'),
      transaction.type,
      transaction.amount.toString(),
      transaction.categoryName,
      transaction.walletName,
      transaction.reason,
      transaction.note ?? '',
    ]),
  ];
  return buildSheetXml(rows);
}

function buildDailySheetXml(data: ReturnType<typeof buildMonthlyReportData>) {
  const rows = [['Day', 'Income', 'Expense', 'Net'], ...data.dailySeries.map((point) => [point.label, point.income.toString(), point.expense.toString(), point.net.toString()])];
  return buildSheetXml(rows);
}

function buildSheetXml(rows: string[][]) {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, cellIndex) => {
          const cellRef = `${columnName(cellIndex + 1)}${rowIndex + 1}`;
          if (isNumeric(value) && rowIndex > 0) {
            return `<c r="${cellRef}"><v>${value}</v></c>`;
          }
          return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function createZip(files: Map<string, Uint8Array>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
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

function textFile(value: string) {
  return new TextEncoder().encode(value);
}

function createLocalHeader(nameBytes: Uint8Array, crc: number, size: number) {
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

function createCentralHeader(nameBytes: Uint8Array, crc: number, size: number, offset: number) {
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

function createEndRecord(entryCount: number, directorySize: number, directoryOffset: number) {
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

function crc32(bytes: Uint8Array) {
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

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function isNumeric(value: string) {
  return /^-?\d+(\.\d+)?$/.test(value);
}

function columnName(index: number) {
  let current = index;
  let name = '';
  while (current > 0) {
    current -= 1;
    name = String.fromCharCode(65 + (current % 26)) + name;
    current = Math.floor(current / 26);
  }
  return name;
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
