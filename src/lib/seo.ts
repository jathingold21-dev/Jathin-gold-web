import { company } from '../data/company';
import { branches, type Branch } from '../data/branches';
import type { Faq } from '../data/faqs';

export function absUrl(path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p === '/') return company.site;
  return `${company.site}${p}`;
}

export function titleTag(page: string) {
  return page.includes(company.name) ? page : `${page} | ${company.name}`;
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    url: company.site,
    email: company.email,
    telephone: company.phone,
    description: company.description,
    areaServed: { '@type': 'City', name: company.region },
  };
}

export function localBusinessJsonLd(branch: Branch) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `${company.name} — ${branch.name}`,
    image: absUrl('/og.jpg'),
    url: absUrl(`/branches/${branch.slug}`),
    telephone: branch.phone,
    email: company.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: branch.address,
      addressLocality: branch.city,
      addressRegion: branch.state,
      postalCode: branch.postalCode,
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: branch.geo.lat,
      longitude: branch.geo.lng,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '09:30',
      closes: '19:00',
    },
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, UPI, Bank Transfer',
    areaServed: branch.city,
  };
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function serviceJsonLd(opts: { name: string; path: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    url: absUrl(opts.path),
    provider: { '@type': 'Organization', name: company.name, url: company.site },
    areaServed: { '@type': 'City', name: company.region },
    serviceType: opts.name,
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absUrl(item.path),
    })),
  };
}

export function articleJsonLd(opts: {
  title: string;
  description: string;
  path: string;
  date: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    datePublished: opts.date,
    mainEntityOfPage: absUrl(opts.path),
    author: { '@type': 'Organization', name: company.name },
    publisher: { '@type': 'Organization', name: company.name },
  };
}

export function allBranchesJsonLd() {
  return branches.map(localBusinessJsonLd);
}
