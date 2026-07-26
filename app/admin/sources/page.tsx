import { readAllResults } from "@/crawler/store";

export default async function SourcesPage() {
  const candidates = (await readAllResults()).flatMap((result) => result.candidates.map((item) => ({ ...item, municipalityName: result.municipalityName })));
  const sources = [...new Map(candidates.map((item) => [item.sourceUrl, item])).values()];
  return <main id="main" className="page-shell admin-shell"><p className="eyebrow">管理確認用</p><h1>クロール出典</h1>
    <p>{sources.length}件</p><div className="table-scroll"><table><thead><tr><th>自治体</th><th>種別</th><th>出典URL</th><th>公開・更新日</th><th>取得日</th></tr></thead>
      <tbody>{sources.map((item) => <tr key={item.sourceUrl}><td>{item.municipalityName}</td><td>{item.sourceType}</td><td><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.title}</a></td><td>{item.sourcePublishedAt || "不明"}</td><td>{item.extractedAt}</td></tr>)}</tbody>
    </table></div></main>;
}
