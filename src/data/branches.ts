export type Branch = {
  slug: string;
  name: string;
  area: string;
  city: string;
  citySlug: string;
  state: string;
  address: string;
  postalCode: string;
  mapsUrl: string;
  /** lat,lng for LocalBusiness schema — replace with real pins */
  geo: { lat: number; lng: number };
  phone: string;
  hoursLabel: string;
  note: string;
};

/** Placeholder Hyderabad branches. Swap addresses, maps, and geo before launch. */
export const branches: Branch[] = [
  {
    slug: 'banjara-hills',
    name: 'Banjara Hills',
    area: 'Road No. 12',
    city: 'Hyderabad',
    citySlug: 'hyderabad',
    state: 'Telangana',
    address: 'Road No. 12, Banjara Hills, Hyderabad, Telangana 500034',
    postalCode: '500034',
    mapsUrl: 'https://maps.google.com/?q=Banjara+Hills+Hyderabad',
    geo: { lat: 17.4126, lng: 78.4484 },
    phone: '+919700091700',
    hoursLabel: '9:30 AM – 7:00 PM, 7 days',
    note: 'Main evaluation desk. Gold, silver, and platinum.',
  },
  {
    slug: 'kukatpally',
    name: 'Kukatpally',
    area: 'KPHB',
    city: 'Hyderabad',
    citySlug: 'hyderabad',
    state: 'Telangana',
    address: 'KPHB Main Road, Kukatpally, Hyderabad, Telangana 500072',
    postalCode: '500072',
    mapsUrl: 'https://maps.google.com/?q=Kukatpally+Hyderabad',
    geo: { lat: 17.4948, lng: 78.3996 },
    phone: '+919700091700',
    hoursLabel: '9:30 AM – 7:00 PM, 7 days',
    note: 'Same live-rate protocol as Banjara Hills.',
  },
  {
    slug: 'secunderabad',
    name: 'Secunderabad',
    area: 'MG Road',
    city: 'Hyderabad',
    citySlug: 'hyderabad',
    state: 'Telangana',
    address: 'MG Road, Secunderabad, Hyderabad, Telangana 500003',
    postalCode: '500003',
    mapsUrl: 'https://maps.google.com/?q=Secunderabad+MG+Road',
    geo: { lat: 17.4399, lng: 78.4983 },
    phone: '+919700091700',
    hoursLabel: '9:30 AM – 7:00 PM, 7 days',
    note: 'Walk-in evaluation. Instant payout after KYC.',
  },
];

export const cities = [...new Map(branches.map((b) => [b.citySlug, b.city])).entries()].map(
  ([slug, name]) => ({ slug, name, branches: branches.filter((b) => b.citySlug === slug) }),
);

export const getBranch = (slug: string) => branches.find((b) => b.slug === slug);
export const getCity = (slug: string) => cities.find((c) => c.slug === slug);
