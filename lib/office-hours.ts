type OfficeHoursContext = {
  scope: "municipality" | "prefecture" | "national";
  contactType: "direct" | "self-reliance" | "representative";
};

export function shouldEstimateMunicipalHours(office: OfficeHoursContext): boolean {
  return office.scope === "municipality" && office.contactType !== "direct";
}
