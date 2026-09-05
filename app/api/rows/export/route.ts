import ExcelJS from "exceljs";
import { rowsCollection } from "@/lib/mongodb";
import { CRITERIA, QUESTIONS, questionLabel } from "@/lib/schema";

export const dynamic = "force-dynamic";

/** Name, Set, then five columns per question, then the sync timestamp. */
const LEAD_COLUMNS = 2;
const COLUMNS_PER_QUESTION = CRITERIA.length + 1;

function columnLetter(index: number): string {
  // 1 -> A. The sheet never exceeds 26 columns, so a single letter suffices.
  return String.fromCharCode("A".charCodeAt(0) + index - 1);
}

/** The combined list as an .xlsx, with the two-tier header merged as drawn. */
export async function GET() {
  const collection = await rowsCollection();
  const docs = await collection.find({}).sort({ name: 1 }).toArray();

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Combined list");

  const totalColumns =
    LEAD_COLUMNS + QUESTIONS.length * COLUMNS_PER_QUESTION + 1;
  const lastColumn = columnLetter(totalColumns);

  // Row 1: Name | Set | Q1 …spanned… | Q2 | Q3 | Last synced
  // Row 2:             | Logic | Explanation | Time | Space | Remark | …
  const topRow: string[] = ["Name", "Set"];
  const subRow: string[] = ["", ""];
  for (const question of QUESTIONS) {
    topRow.push(questionLabel(question), "", "", "", "");
    subRow.push(...CRITERIA.map(({ label }) => label), "Remark");
  }
  topRow.push("Last synced");
  subRow.push("");

  sheet.addRow(topRow);
  sheet.addRow(subRow);

  // Name, Set and Last synced span both header rows; each question spans its five.
  sheet.mergeCells("A1:A2");
  sheet.mergeCells("B1:B2");
  sheet.mergeCells(`${lastColumn}1:${lastColumn}2`);
  for (const question of QUESTIONS) {
    const first = LEAD_COLUMNS + question * COLUMNS_PER_QUESTION + 1;
    sheet.mergeCells(
      `${columnLetter(first)}1:${columnLetter(first + COLUMNS_PER_QUESTION - 1)}1`,
    );
  }

  for (const rowNumber of [1, 2]) {
    const row = sheet.getRow(rowNumber);
    row.font = { bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }

  for (const doc of docs) {
    const values: (string | Date)[] = [doc.name, doc.set];
    for (const question of QUESTIONS) {
      const score = doc.questions[question];
      values.push(
        ...CRITERIA.map(({ key }) => score?.[key] ?? ""),
        score?.remark ?? "",
      );
    }
    values.push(doc.syncedAt);
    sheet.addRow(values);
  }

  sheet.columns.forEach((column, index) => {
    const position = index + 1;
    const isRemark = // the fifth column of each question block
      position > LEAD_COLUMNS &&
      position <= LEAD_COLUMNS + QUESTIONS.length * COLUMNS_PER_QUESTION &&
      (position - LEAD_COLUMNS) % COLUMNS_PER_QUESTION === 0;

    if (position === 1) column.width = 24;
    else if (position === totalColumns) column.width = 20;
    else if (isRemark) column.width = 32;
    else column.width = 12;
  });

  sheet.getColumn(totalColumns).numFmt = "yyyy-mm-dd hh:mm";
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `placement-drive-combined-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
