import { getPublicStats } from "@/lib/public-stats";

export const dynamic = "force-static";

export function GET() {
  return Response.json(getPublicStats(), {
    headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
  });
}
