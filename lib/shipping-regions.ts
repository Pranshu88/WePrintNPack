export const COUNTRIES = [
  { code: "CA", name: "Canada" },
  { code: "US", name: "United States" },
];

export const CA_PROVINCES = [
  "Alberta (AB)", "British Columbia (BC)", "Manitoba (MB)", "New Brunswick (NB)",
  "Newfoundland and Labrador (NL)", "Nova Scotia (NS)", "Northwest Territories (NT)",
  "Nunavut (NU)", "Ontario (ON)", "Prince Edward Island (PE)", "Quebec (QC)",
  "Saskatchewan (SK)", "Yukon (YT)",
];

export const US_STATES = [
  "Alabama (AL)", "Alaska (AK)", "Arizona (AZ)", "Arkansas (AR)", "California (CA)",
  "Colorado (CO)", "Connecticut (CT)", "Delaware (DE)", "Florida (FL)", "Georgia (GA)",
  "Hawaii (HI)", "Idaho (ID)", "Illinois (IL)", "Indiana (IN)", "Iowa (IA)",
  "Kansas (KS)", "Kentucky (KY)", "Louisiana (LA)", "Maine (ME)", "Maryland (MD)",
  "Massachusetts (MA)", "Michigan (MI)", "Minnesota (MN)", "Mississippi (MS)", "Missouri (MO)",
  "Montana (MT)", "Nebraska (NE)", "Nevada (NV)", "New Hampshire (NH)", "New Jersey (NJ)",
  "New Mexico (NM)", "New York (NY)", "North Carolina (NC)", "North Dakota (ND)", "Ohio (OH)",
  "Oklahoma (OK)", "Oregon (OR)", "Pennsylvania (PA)", "Rhode Island (RI)", "South Carolina (SC)",
  "South Dakota (SD)", "Tennessee (TN)", "Texas (TX)", "Utah (UT)", "Vermont (VT)",
  "Virginia (VA)", "Washington (WA)", "West Virginia (WV)", "Wisconsin (WI)", "Wyoming (WY)",
];

export function regionsForCountry(countryCode: string): string[] {
  return countryCode === "US" ? US_STATES : CA_PROVINCES;
}

// Region values are stored/displayed as "Ontario (ON)" — carrier APIs (Sinalite's
// shippingEstimate included) expect just the 2-letter code. Extract it here rather
// than changing what the address form stores and shows.
export function regionCode(displayName: string): string {
  const match = displayName.match(/\(([A-Z]{2})\)\s*$/);
  return match ? match[1] : displayName;
}

export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

// Full "Street, Line2, City, Province, Postal, Country, Phone" display used once a
// saved address is loaded — every stored field, comma-separated, blanks skipped.
export function fullAddressLine(a: { flat: string; houseNo: string; city: string; state: string; postalCode: string; country: string; phone: string }): string {
  return [a.flat, a.houseNo, a.city, a.state, a.postalCode, a.country ? countryName(a.country) : "", a.phone]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}
