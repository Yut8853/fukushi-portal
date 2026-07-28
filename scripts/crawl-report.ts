import { readAllResults, readQueue } from "../crawler/store";
import { getPortalData } from "../lib/data/repository";

async function main() {
  const [jobs, results, portalData] = await Promise.all([
    readQueue(),
    readAllResults(),
    getPortalData(),
  ]);
  const candidates = results.flatMap((result) => result.candidates);
  const categories = new Map<string, number>(portalData.categories.map(({ id }) => [id, 0]));
  candidates.forEach((item) =>
    categories.set(item.categoryId, (categories.get(item.categoryId) ?? 0) + 1),
  );
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        jobs: jobs.length,
        statuses: Object.fromEntries(
          [...new Set(jobs.map((job) => job.status))].map((status) => [
            status,
            jobs.filter((job) => job.status === status).length,
          ]),
        ),
        candidates: candidates.length,
        reviewRequired: candidates.filter((item) => item.status === "review_required").length,
        pdfParsed: jobs.reduce((sum, job) => sum + job.documentsParsed, 0),
        categories: Object.fromEntries(categories),
        errors: jobs
          .filter((job) => job.lastError)
          .map((job) => ({
            code: job.municipalityCode,
            name: job.municipalityName,
            error: job.lastError,
          })),
      },
      null,
      2,
    ),
  );
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
