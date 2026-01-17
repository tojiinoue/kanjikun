/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "..", "data", "municipalities.csv");
const outputPath = path.join(__dirname, "..", "data", "municipalities.json");

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return value.replace(/\s/g, "").trim();
}

function findIndex(headers, candidates) {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const index = normalized.indexOf(normalizeHeader(candidate));
    if (index !== -1) return index;
  }
  return -1;
}

function padPrefCode(value) {
  if (!value) return null;
  return value.toString().padStart(2, "0");
}

function toMunicipalities(rows) {
  const headers = rows[0] ?? [];

  const prefCodeIndex = findIndex(headers, [
    "都道府県コード",
    "都道府県ｺｰﾄﾞ",
    "都道府県",
    "pref_code",
    "prefCode",
  ]);
  const municipalityCodeIndex = findIndex(headers, [
    "市区町村コード",
    "市区町村ｺｰﾄﾞ",
    "自治体コード",
    "標準地域コード",
    "municipality_code",
    "municipalityCode",
  ]);
  const nameIndex = findIndex(headers, [
    "市区町村名",
    "市区町村名(漢字)",
    "市区町村名（漢字）",
    "市区町村",
    "municipality_name",
  ]);
  const nameKanaIndex = findIndex(headers, [
    "市区町村名(カナ)",
    "市区町村名（カナ）",
    "市区町村名（かな）",
    "市区町村（ふりがな）",
    "municipality_kana",
  ]);
  const majorNameIndex = findIndex(headers, [
    "政令市･郡･支庁･振興局等",
    "政令市・郡・支庁・振興局等",
  ]);
  const majorNameKanaIndex = findIndex(headers, [
    "政令市･郡･支庁･振興局等（ふりがな）",
    "政令市・郡・支庁・振興局等（ふりがな）",
  ]);

  return rows.slice(1).reduce((acc, row) => {
    const majorName =
      majorNameIndex !== -1 ? row[majorNameIndex]?.trim() : "";
    const minorName = nameIndex !== -1 ? row[nameIndex]?.trim() : "";
    const name =
      majorName && minorName
        ? `${majorName}${minorName}`
        : minorName || majorName;
    if (!name) return acc;

    const rawPref = prefCodeIndex !== -1 ? row[prefCodeIndex]?.trim() : "";
    const rawMunicipalityCode =
      municipalityCodeIndex !== -1 ? row[municipalityCodeIndex]?.trim() : "";
    const municipalityCode = rawMunicipalityCode || "";
    const prefCandidate =
      rawPref && /^\d{1,2}$/.test(rawPref) ? rawPref : "";
    const prefCode = padPrefCode(
      prefCandidate || municipalityCode.slice(0, 2)
    );

    if (!prefCode) return acc;

    acc.push({
      prefCode,
      name,
      municipalityCode: municipalityCode || null,
      nameKana:
        majorNameKanaIndex !== -1 || nameKanaIndex !== -1
          ? `${majorNameKanaIndex !== -1 ? row[majorNameKanaIndex]?.trim() : ""}${
              nameKanaIndex !== -1 ? row[nameKanaIndex]?.trim() : ""
            }`.trim() || null
          : null,
      sortOrder: null,
    });

    return acc;
  }, []);
}

function main() {
  const raw = fs.readFileSync(inputPath, "utf-8");
  const content = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const rows = parseCsv(content);
  if (rows.length === 0) {
    throw new Error("CSVが空です");
  }

  const municipalities = toMunicipalities(rows).sort((a, b) => {
    if (a.prefCode === b.prefCode) {
      return a.name.localeCompare(b.name, "ja");
    }
    return a.prefCode.localeCompare(b.prefCode);
  });

  fs.writeFileSync(outputPath, JSON.stringify(municipalities, null, 2));
  console.log(
    `municipalities.json を生成しました: ${municipalities.length} 件 (${outputPath})`
  );
}

main();
