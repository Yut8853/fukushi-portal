import {
  categorySchema,
  municipalityProgramSchema,
  municipalitySchema,
  officeSchema,
  prefectureSchema,
  programSchema,
  sourceSchema,
} from "./schemas";
import type { PortalData } from "./repository";
import type { ZodType } from "zod";

type DatabaseRow = Record<string, unknown>;

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function csvCompatibleRow(row: DatabaseRow): Record<string, string> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    toCamelCase(key),
    value === null || value === undefined ? "" : typeof value === "boolean" ? String(value) : String(value),
  ]));
}

async function fetchTable<T>(
  table: string,
  schema: ZodType<T>,
  url: string,
  serviceRoleKey: string,
): Promise<T[]> {
  const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase ${table} の取得に失敗しました: HTTP ${response.status} ${detail.slice(0, 300)}`);
  }
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error(`Supabase ${table} の応答が配列ではありません。`);
  return payload.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Supabase ${table} ${index + 1}行目がオブジェクトではありません。`);
    }
    const result = schema.safeParse(csvCompatibleRow(item as DatabaseRow));
    if (!result.success) {
      const detail = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      throw new Error(`Supabase ${table} ${index + 1}行目: ${detail}`);
    }
    return result.data;
  });
}

export async function getSupabasePortalData(): Promise<PortalData> {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "") ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceRoleKey) {
    throw new Error("DATA_BACKEND=supabase にはSUPABASE_URLとSUPABASE_SERVICE_ROLE_KEYが必要です。");
  }
  const [prefectures, categories, municipalities, offices, programs, municipalityPrograms, sources] =
    await Promise.all([
      fetchTable("prefectures", prefectureSchema, url, serviceRoleKey),
      fetchTable("categories", categorySchema, url, serviceRoleKey),
      fetchTable("municipalities", municipalitySchema, url, serviceRoleKey),
      fetchTable("offices", officeSchema, url, serviceRoleKey),
      fetchTable("programs", programSchema, url, serviceRoleKey),
      fetchTable("municipality_programs", municipalityProgramSchema, url, serviceRoleKey),
      fetchTable("sources", sourceSchema, url, serviceRoleKey),
    ]);
  return { prefectures, categories, municipalities, offices, programs, municipalityPrograms, sources };
}
