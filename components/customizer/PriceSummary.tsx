"use client";

interface PriceSummaryProps {
  basePrice: number | null;
  quantity: number;
}

export default function PriceSummary({ basePrice, quantity }: PriceSummaryProps) {
  if (basePrice === null) {
    return (
      <div className="text-[#64748B] text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-center">
        Select a configuration style to view quote.
      </div>
    );
  }

  const total = basePrice * quantity;

  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 space-y-2.5 shadow-sm">
      <div className="flex justify-between text-sm text-[#64748B]">
        <span>Base Unit Fee</span>
        <span className="font-mono text-[#0F172A]">৳{basePrice.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-sm text-[#64748B]">
        <span>Batch Quantity</span>
        <span className="font-mono text-[#0F172A]">×{quantity}</span>
      </div>
      <div className="flex justify-between font-bold text-base border-t border-[#E2E8F0] pt-2.5 text-[#0F172A]">
        <span>Estimated Total</span>
        <span className="font-mono text-[#059669]">৳{total.toFixed(2)}</span>
      </div>
    </div>
  );
}
