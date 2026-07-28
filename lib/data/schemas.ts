import { z } from "zod";

export const statusSchema = z.enum([
  "draft",
  "researching",
  "review_required",
  "verified",
  "published",
  "expired",
  "suspended",
]);
export const municipalityTypeSchema = z.enum(["special_ward", "city", "town", "village"]);
export const supportLevelSchema = z.enum(["basic", "standard", "detailed"]);
export const scopeSchema = z.enum(["national", "prefecture", "municipality", "private"]);
export const supportTypeSchema = z.enum([
  "benefit",
  "loan",
  "reduction",
  "deferment",
  "goods",
  "housing",
  "consultation",
  "medical",
  "employment",
  "other",
]);

const optionalString = z.string().default("");
const optionalUrl = z.union([z.literal(""), z.url()]);
const optionalDate = z.union([z.literal(""), z.iso.date()]);
const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");
const optionalBooleanString = z
  .enum(["", "true", "false"])
  .transform((value) => (value === "" ? null : value === "true"));

export const prefectureSchema = z.object({
  code: z.string().regex(/^\d{2}$/),
  name: z.string().min(1),
  nameKana: optionalString,
});

export const categorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: optionalString,
  consultationScript: z
    .string()
    .min(10)
    .regex(/[ぁ-んァ-ヶ一-龠]/, "日本語の案内文を入力してください。"),
  sortOrder: z.string().regex(/^\d+$/).transform(Number),
});

export const municipalitySchema = z.object({
  id: z.string().min(1),
  prefectureCode: z.string().regex(/^\d{2}$/),
  municipalityCode: z.string().regex(/^\d{5,6}$/),
  name: z.string().min(1),
  nameKana: optionalString,
  municipalityType: municipalityTypeSchema,
  officialUrl: optionalUrl,
  representativePhone: optionalString,
  supportLevel: supportLevelSchema,
  status: statusSchema,
  lastVerifiedAt: optionalDate,
});

export const officeSchema = z.object({
  id: z.string().min(1),
  municipalityId: optionalString,
  scope: z.enum(["municipality", "prefecture", "national"]).default("municipality"),
  prefectureCode: optionalString,
  categoryId: z.string().min(1),
  name: z.string().min(1),
  plainName: optionalString,
  department: optionalString,
  description: optionalString,
  postalCode: optionalString,
  address: optionalString,
  phone: optionalString,
  fax: optionalString,
  email: z.union([z.literal(""), z.email()]),
  contactFormUrl: optionalUrl,
  officialUrl: optionalUrl,
  openingHours: optionalString,
  closedDays: optionalString,
  reservationRequired: optionalBooleanString,
  availableMethods: optionalString,
  accessibility: optionalString,
  languages: optionalString,
  emergencyAlternative: optionalString,
  serviceArea: optionalString,
  eligibilityConditions: optionalString,
  contactType: z.enum(["", "direct", "self-reliance", "representative"]).default(""),
  verificationLevel: z
    .enum(["", "primary_source_import", "human_verified", "user_reported"])
    .default(""),
  sourceId: optionalString,
  status: statusSchema,
  lastVerifiedAt: optionalDate,
});

export const programSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  plainName: z.string().min(1),
  categoryId: z.string().min(1),
  scope: scopeSchema,
  description: z.string().min(1),
  targetPeople: optionalString,
  supportType: supportTypeSchema,
  repaymentRequired: booleanString,
  amountDescription: optionalString,
  applicationDeadline: optionalString,
  requiredDocuments: optionalString,
  documentsOptionalNote: optionalString,
  applicationFlow: optionalString,
  officeId: optionalString,
  municipalityId: optionalString,
  sourceId: optionalString,
  status: statusSchema,
  lastVerifiedAt: optionalDate,
});

export const municipalityProgramSchema = z.object({
  id: z.string().min(1),
  municipalityId: z.string().min(1),
  programId: z.string().min(1),
  localName: optionalString,
  localDescription: optionalString,
  officeId: optionalString,
  sourceId: optionalString,
  status: statusSchema,
  lastVerifiedAt: optionalDate,
});

export const sourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.url(),
  publisher: optionalString,
  sourceType: z.enum(["official", "law", "other"]),
  status: statusSchema,
  lastVerifiedAt: optionalDate,
});

export type Prefecture = z.infer<typeof prefectureSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Municipality = z.infer<typeof municipalitySchema>;
export type Office = z.infer<typeof officeSchema>;
export type Program = z.infer<typeof programSchema>;
export type MunicipalityProgram = z.infer<typeof municipalityProgramSchema>;
export type Source = z.infer<typeof sourceSchema>;
