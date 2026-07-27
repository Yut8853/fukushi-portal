import { findClosedDays, findOpeningHours } from "../crawler/extractor";
import { readAllResults, writeResult } from "../crawler/store";

async function main() {
  const results = await readAllResults();
  let updated = 0;
  let cleared = 0;
  let populated = 0;
  for (const result of results) {
    let resultChanged = false;
    for (const candidate of result.candidates) {
      if (candidate.status !== "review_required") continue;
      const openingHours = findOpeningHours(candidate.originalText);
      const closedDays = findClosedDays(candidate.originalText);
      if (candidate.openingHours === openingHours && candidate.closedDays === closedDays) continue;
      if (candidate.openingHours && !openingHours) cleared += 1;
      if (!candidate.openingHours && openingHours) populated += 1;
      candidate.openingHours = openingHours;
      candidate.openingHoursOriginal = openingHours;
      candidate.closedDays = closedDays;
      resultChanged = true;
      updated += 1;
    }
    if (resultChanged) await writeResult(result);
  }
  console.log(`受付時間候補を再解析: ${results.length}自治体 / 更新${updated}件 / 新規${populated}件 / 誤候補除外${cleared}件`);
}

void main();
