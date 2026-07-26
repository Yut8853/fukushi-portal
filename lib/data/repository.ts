import path from "node:path";
import { readCsvFile } from "@/lib/csv";
import {
  categorySchema, municipalityProgramSchema, municipalitySchema, officeSchema,
  prefectureSchema, programSchema, sourceSchema,
  type Category, type Municipality, type MunicipalityProgram, type Office,
  type Prefecture, type Program, type Source,
} from "./schemas";
import type { ZodType } from "zod";

export type PortalData = {
  prefectures: Prefecture[];
  categories: Category[];
  municipalities: Municipality[];
  offices: Office[];
  programs: Program[];
  municipalityPrograms: MunicipalityProgram[];
  sources: Source[];
};

async function load<T>(dataDirectory: string, filename: string, schema: ZodType<T>): Promise<T[]> {
  const rows = await readCsvFile(path.join(dataDirectory, filename));
  return rows.map((row, index) => {
    const result = schema.safeParse(row);
    if (!result.success) {
      const detail = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      throw new Error(`${filename} ${index + 2}行目: ${detail}`);
    }
    return result.data;
  });
}

export async function getPortalData(
  dataDirectory = path.join(process.cwd(), "data"),
): Promise<PortalData> {
  const [prefectures, categories, municipalities, offices, programs, municipalityPrograms, sources] =
    await Promise.all([
      load(dataDirectory, "prefectures.csv", prefectureSchema),
      load(dataDirectory, "categories.csv", categorySchema),
      load(dataDirectory, "municipalities.csv", municipalitySchema),
      load(dataDirectory, "offices.csv", officeSchema),
      load(dataDirectory, "programs.csv", programSchema),
      load(dataDirectory, "municipality-programs.csv", municipalityProgramSchema),
      load(dataDirectory, "sources.csv", sourceSchema),
    ]);
  return { prefectures, categories, municipalities, offices, programs, municipalityPrograms, sources };
}

export async function getPublicPortalData(): Promise<PortalData> {
  const data = await getPortalData();
  const sources = data.sources.filter((source) => source.status === "published");
  const sourceIds = new Set(sources.map((source) => source.id));
  const municipalities = data.municipalities.filter((item) => item.status === "published");
  const municipalityIds = new Set(municipalities.map((item) => item.id));
  const offices = data.offices.filter((item) =>
    item.status === "published" && municipalityIds.has(item.municipalityId) && sourceIds.has(item.sourceId),
  );
  const officeIds = new Set(offices.map((item) => item.id));
  const programs = data.programs.filter((item) =>
    item.status === "published" && sourceIds.has(item.sourceId)
    && (!item.officeId || officeIds.has(item.officeId))
    && (!item.municipalityId || municipalityIds.has(item.municipalityId)),
  );
  const programIds = new Set(programs.map((item) => item.id));
  const municipalityPrograms = data.municipalityPrograms.filter((item) =>
    item.status === "published" && municipalityIds.has(item.municipalityId)
    && programIds.has(item.programId) && sourceIds.has(item.sourceId),
  );
  return { ...data, municipalities, offices, programs, municipalityPrograms, sources };
}
