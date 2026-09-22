/** Replace placeholder NAP, hours, and domain before launch. */
export const company = {
  name: 'Jathin Gold',
  legalName: 'Jathin Gold',
  shortName: 'Jathin',
  /** Placeholder domain — set to the real host before launch. */
  site: 'https://www.jathingold.com',
  tagline: 'We buy gold, silver, and platinum. We do not sell jewellery.',
  description:
    'Jathin Gold is a dedicated precious-metal buyer. Walk in with gold, silver, or platinum, watch the purity test, and take cash or a bank transfer the same visit.',
  phone: '+919700091700',
  phoneDisplay: '+91 97000 91700',
  phoneShort: '97000 91700',
  whatsapp: '919700091700',
  email: 'Jathingold21@gmail.com',
  region: 'Andhra Pradesh and Telangana',
  state: 'Telangana',
  address:
    '6-3-32/A, Near By Railway Station, Chinna Bazar Road, Kothagudem, Kothagudem-507101, Telangana',
  country: 'IN',
  hoursLabel: 'Open 7 days, 9:30 AM – 7:00 PM',
  hoursSpec: 'Mo-Su 09:30-19:00',
  establishedYear: 2018,
  /**
   * Applied only when quoting from international spot (not IBJA).
   * Indian bullion trades above LBMA because of import duty and local premium.
   * Tune after comparing a branch quote to the on-screen 22K figure.
   */
  indiaLandingFactor: 1.12,
} as const;

export const whatsappUrl = (text?: string) => {
  const base = `https://wa.me/${company.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
};

export const telUrl = `tel:${company.phone}`;
