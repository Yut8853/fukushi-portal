import { z } from "zod";
import data from "@/data/emergency-contacts.json";

const emergencyContactSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  number: z.string().min(1),
  phoneHref: z.string().startsWith("tel:"),
  officialUrl: z.url(),
  publisher: z.string().min(1),
  cost: z.string().min(1),
  availability: z.string().min(1),
  displayMode: z.enum(["primary", "detail"]),
  lastVerifiedAt: z.iso.date(),
});

export const emergencyContacts = z.array(emergencyContactSchema).parse(data);
