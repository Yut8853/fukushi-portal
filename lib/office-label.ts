type OfficeLabel = {
  name: string;
  plainName: string;
};

export function officeDisplayName(office: OfficeLabel): string {
  return office.plainName || office.name;
}

export function officeOrganizationName(office: OfficeLabel): string {
  return office.plainName && office.name !== office.plainName ? office.name : "";
}
