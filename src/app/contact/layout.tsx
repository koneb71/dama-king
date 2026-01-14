import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with the Dama King team. Have questions, feedback, or need support? We\'re here to help you with anything related to Filipino Checkers.',
  openGraph: {
    title: 'Contact Us | Dama King',
    description: 'Get in touch with the Dama King team. Questions, feedback, or support - we\'re here to help!',
    type: 'website',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
