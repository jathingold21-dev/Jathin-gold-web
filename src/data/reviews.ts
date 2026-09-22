export interface CustomerReview {
  id: string;
  headline: string;
  quote: string;
  author: string;
  role: string;
  avatar: string;
  rating: number;
}

export const customerReviews: CustomerReview[] = [
  {
    id: 'review-1',
    headline: '100% Transparent Process',
    quote:
      'I visited their Kukatpally branch to sell old family jewellery. They tested each piece using their German XRF Karatmeter right in front of me with zero melting or acid. Complete transparency and paid to my account in 10 minutes.',
    author: 'Priya Raman',
    role: 'Kukatpally, Hyderabad',
    avatar: '/reviews/priya.jpg',
    rating: 5.0,
  },
  {
    id: 'review-2',
    headline: 'Highest Gold Rate Paid',
    quote:
      'Compared quotes across three different gold buyers in Hyderabad. Jathin Gold offered the highest rate per gram based on live MCX prices without any hidden fee deductions. Genuine, courteous, and very professional team.',
    author: 'Ramesh Naidu',
    role: 'Dilsukhnagar, Hyderabad',
    avatar: '/reviews/ramesh.jpg',
    rating: 5.0,
  },
  {
    id: 'review-3',
    headline: 'Smooth Pledged Gold Release',
    quote:
      'I had pledged gold at a local finance company and was struggling with the high interest. Jathin Gold cleared the loan directly, released my gold safely, and handed over the balance amount on the same visit. Lifesaver!',
    author: 'Venkatesh Iyer',
    role: 'Ameerpet, Hyderabad',
    avatar: '/reviews/venkat.jpg',
    rating: 5.0,
  },
  {
    id: 'review-4',
    headline: 'Instant Cash & Respectful Service',
    quote:
      'The entire experience was dignified and hassle-free. From digital weight verification to immediate bank transfer, there were no surprises. Highly recommended for anyone wanting a safe and honest gold buyer.',
    author: 'Ananya Reddy',
    role: 'Secunderabad, Hyderabad',
    avatar: '/reviews/ananya.jpg',
    rating: 5.0,
  },
];
