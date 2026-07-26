import { readAllResults } from "@/crawler/store";
import { readSourceMonitorRecords } from "@/crawler/source-monitor";
import { getPortalData } from "@/lib/data/repository";

export default async function SourcesPage() {
  const [data, monitorRecords, crawlResults] = await Promise.all([
    getPortalData(),
    readSourceMonitorRecords(),
    readAllResults(),
  ]);
  const monitor = new Map(monitorRecords.map((record) => [record.sourceId, record]));
  const attention = monitorRecords.filter((record) =>
    record.status === "changed" || record.status === "failed" || record.status === "blocked_by_robots",
  );
  const candidates = crawlResults.flatMap((result) =>
    result.candidates.map((item) => ({ ...item, municipalityName: result.municipalityName })),
  );
  const crawlSources = [...new Map(candidates.map((item) => [item.sourceUrl, item])).values()];
  return <main id="main" className="page-shell admin-shell">
    <p className="eyebrow">管理確認用</p><h1>出典と変更監視</h1>
    <p>公開出典 {data.sources.length}件・要確認 {attention.length}件</p>
    <div className="table-scroll"><table><thead><tr><th>発行元</th><th>出典</th><th>公開状態</th><th>変更監視</th><th>監視日時</th></tr></thead>
      <tbody>{data.sources.map((source) => {
        const record = monitor.get(source.id);
        return <tr key={source.id}>
          <td>{source.publisher}</td>
          <th scope="row"><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></th>
          <td>{source.status}</td>
          <td><span className={`status status-${record?.status ?? "unmonitored"}`}>{record?.status ?? "未監視"}</span>{record?.error && <small className="job-error">{record.error}</small>}</td>
          <td>{record?.checkedAt ? new Date(record.checkedAt).toLocaleString("ja-JP") : "未実施"}</td>
        </tr>;
      })}</tbody>
    </table></div>
    <h2>クロールで見つけた出典</h2>
    <p>{crawlSources.length}件</p>
    <div className="table-scroll"><table><thead><tr><th>自治体</th><th>種別</th><th>出典URL</th><th>公開・更新日</th><th>取得日</th></tr></thead>
      <tbody>{crawlSources.map((item) => <tr key={item.sourceUrl}><td>{item.municipalityName}</td><td>{item.sourceType}</td><td><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.title}</a></td><td>{item.sourcePublishedAt || "不明"}</td><td>{item.extractedAt}</td></tr>)}</tbody>
    </table></div>
  </main>;
}
