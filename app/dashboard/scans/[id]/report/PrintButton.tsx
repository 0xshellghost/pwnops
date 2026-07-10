'use client';

export default function PrintButton() {
  return (
    <button 
      className="mt-2 px-4 py-1 bg-black text-white text-sm rounded print:hidden hover:bg-gray-800"
      onClick={() => window.print()}
    >
      Print / Save as PDF
    </button>
  );
}
