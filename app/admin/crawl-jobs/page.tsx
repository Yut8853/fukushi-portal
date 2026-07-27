import { readQueue } from "@/crawler/store";

export default async function CrawlJobsPage() {
  const jobs = await readQueue();
  return (
    <main id="main" className="page-shell admin-shell">
      <p className="eyebrow">管理確認用</p>
      <h1>クロールジョブ</h1>
      <p>{jobs.length}件</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>コード</th>
              <th>自治体</th>
              <th>状態</th>
              <th>試行</th>
              <th>ページ</th>
              <th>PDF</th>
              <th>候補</th>
              <th>エラー</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.municipalityId}>
                <td>{job.municipalityCode}</td>
                <th>{job.municipalityName}</th>
                <td>{job.status}</td>
                <td>{job.attemptCount}</td>
                <td>{job.pagesVisited}</td>
                <td>{job.documentsParsed}</td>
                <td>{job.candidatesFound}</td>
                <td className="job-error">{job.lastError}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
