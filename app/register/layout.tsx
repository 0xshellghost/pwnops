import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a PwnOps account to secure your infrastructure.',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
