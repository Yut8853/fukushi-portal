import { findClosedDays, findOpeningHours } from "../crawler/extractor";

const cases = [
  {
    name: "水戸市形式",
    text: "受付時間：午前8時30分から午後5時まで\n休業日：土日祝日，年末年始",
    hours: "午前8時30分から午後5時まで",
    closed: "土日祝日，年末年始",
  },
  {
    name: "24時間",
    text: "相談時間：24時間・年中無休",
    hours: "24時間・年中無休",
    closed: "",
  },
  {
    name: "誤抽出を拒否",
    text: "相談時間：対応）\n詳しくは各機関へ",
    hours: "",
    closed: "",
  },
  {
    name: "支援上限時間を拒否",
    text: "利用時間：同一年度で120時間です",
    hours: "",
    closed: "",
  },
  {
    name: "コロン時刻",
    text: "開所時間 8:30～17:15\n閉庁日 土曜日・日曜日・祝日",
    hours: "8:30～17:15",
    closed: "土曜日・日曜日・祝日",
  },
];

let failures = 0;
for (const item of cases) {
  const hours = findOpeningHours(item.text);
  const closed = findClosedDays(item.text);
  if (hours !== item.hours || closed !== item.closed) {
    failures += 1;
    console.error(`${item.name}: hours=${JSON.stringify(hours)} closed=${JSON.stringify(closed)}`);
  }
}
console.log(`受付時間抽出テスト: ${cases.length - failures}/${cases.length}件成功`);
if (failures) process.exitCode = 1;
