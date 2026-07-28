import generatedStats from "@/data/generated/public-stats.json";

export type PublicStats = typeof generatedStats;

export function getPublicStats(): PublicStats & { deployedCommit: string } {
  return {
    ...generatedStats,
    deployedCommit:
      process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
      process.env.GITHUB_SHA?.trim() ||
      generatedStats.sourceCommit,
  };
}
