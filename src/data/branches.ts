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
  /** lat,lng for LocalBusiness schema — Kothagudem railway station area */
  geo: { lat: number; lng: number };
  phone: string;
  hoursLabel: string;
  note: string;
};

export const deskAddress =
  '6-3-32/A, Near By Railway Station, Chinna Bazar Road, Kothagudem, Kothagudem-507101, Telangana';

/** Single Kothagudem desk. Service covers Andhra Pradesh and Telangana. */
export const branches: Branch[] = [
  {
    slug: 'kothagudem',
    name: 'Kothagudem',
    area: 'Chinna Bazar Road',
    city: 'Kothagudem',
    citySlug: 'kothagudem',
    state: 'Telangana',
    address: deskAddress,
    postalCode: '507101',
    mapsUrl:
      'https://maps.google.com/?q=6-3-32%2FA+Near+By+Railway+Station+Chinna+Bazar+Road+Kothagudem+507101',
    geo: { lat: 17.5514, lng: 80.618 },
    phone: '+919700091700',
    hoursLabel: '9:30 AM – 7:00 PM, 7 days',
    note: 'Available in Andhra Pradesh and Telangana.',
  },
];

export const cities = [...new Map(branches.map((b) => [b.citySlug, b.city])).entries()].map(
  ([slug, name]) => ({ slug, name, branches: branches.filter((b) => b.citySlug === slug) }),
);

export const getBranch = (slug: string) => branches.find((b) => b.slug === slug);
export const getCity = (slug: string) => cities.find((c) => c.slug === slug);
