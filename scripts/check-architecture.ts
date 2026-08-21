import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}

const violations: string[] = [];
for (const file of await files("src/engine")) {
  const source = await readFile(file, "utf8");
  for (const forbidden of ["document", "window", "fetch(", "localStorage", "sessionStorage", "JsValue", "IJSRuntime"]) {
    if (source.includes(forbidden)) violations.push(`${file}: forbidden browser dependency ${forbidden}`);
  }
  if (/\b(any|dynamic)\b/.test(source)) violations.push(`${file}: dynamic type escape`);
}
for (const file of await files("src")) {
  const source = await readFile(file, "utf8");
  if (/SetInnerHtml|ExecuteScript|eval\s*\(/.test(source)) violations.push(`${file}: forbidden escape hatch`);
}
if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Architecture checks passed.");
}
