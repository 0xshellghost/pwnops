import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Status',
  description: 'Real-time status of the PwnOps platform and its services.',
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
