import { prisma } from '@/lib/store';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';
import { ScanResult } from '@/lib/types';

export default async function ScanReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = await prisma.scan.findUnique({
    where: { id },
    include: { organization: true, triggeredBy: true }
  });

  if (!scan) return notFound();

  let results: ScanResult | null = null;
  if (typeof scan.results === 'string') {
    results = { raw: scan.results };
  } else {
    results = scan.results as unknown as ScanResult;
  }

  return (
    <div className="bg-white text-black min-h-screen p-8" style={{ fontFamily: 'sans-serif' }}>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Print Header */}
        <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-widest text-gray-900">PwnOps Scan Report</h1>
            <p className="text-gray-500 mt-1">{scan.organization.name}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm text-gray-500">Scan ID: {scan.id}</p>
            <p className="font-mono text-sm text-gray-500">Generated: {new Date().toLocaleString()}</p>
            <PrintButton />
          </div>
        </div>

        {/* Summary Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-200 p-4 rounded bg-gray-50">
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider mb-2">Execution Details</h3>
            <div className="space-y-1 text-sm font-mono text-gray-800">
              <p><span className="text-gray-500 inline-block w-24">Target:</span> {scan.target}</p>
              <p><span className="text-gray-500 inline-block w-24">Tool:</span> {scan.toolName}</p>
              <p><span className="text-gray-500 inline-block w-24">Status:</span> {scan.status}</p>
              <p><span className="text-gray-500 inline-block w-24">Initiated By:</span> {scan.triggeredBy?.email || 'System / API'}</p>
            </div>
          </div>
          
          <div className="border border-gray-200 p-4 rounded bg-gray-50">
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider mb-2">Timestamps</h3>
            <div className="space-y-1 text-sm font-mono text-gray-800">
              <p><span className="text-gray-500 inline-block w-24">Started:</span> {new Date(scan.startedAt).toLocaleString()}</p>
              <p><span className="text-gray-500 inline-block w-24">Completed:</span> {scan.completedAt ? new Date(scan.completedAt).toLocaleString() : 'N/A'}</p>
              {results?.summary?.duration && (
                <p><span className="text-gray-500 inline-block w-24">Duration:</span> {results.summary.duration}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tool Summary */}
        {results?.summary && (
          <div className="border border-gray-200 p-4 rounded">
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider mb-3">Analysis Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm font-mono text-gray-800">
              <p><span className="text-gray-500">Tool Version:</span> {results.summary.version || 'Unknown'}</p>
              <p>
                <span className="text-gray-500">Alert Status:</span>{' '}
                {results.summary.hasDiffAlert ? (
                  <span className="text-red-600 font-bold">New Findings Detected</span>
                ) : (
                  <span className="text-green-600 font-bold">No New Findings</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Raw Output */}
        <div>
          <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider mb-2 border-b border-gray-200 pb-2">Raw Execution Output</h3>
          <pre className="bg-gray-100 p-4 rounded text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap border border-gray-200 shadow-inner">
            {results?.raw || 'No raw output available.'}
          </pre>
        </div>

      </div>
    </div>
  );
}
