import { Check } from 'lucide-react';

interface BookingProgressProps {
  currentStep: number;
  hasBooking: boolean;
  onStartOver: () => void;
  onChooseVan: () => void;
  onChooseSeat: () => void;
}

export default function BookingProgress({ currentStep, hasBooking, onStartOver, onChooseVan, onChooseSeat }: BookingProgressProps) {
  return (
    <section className="bg-white border-b border-slate-200 pt-4 pb-8 md:py-4 px-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500">
        <button onClick={onStartOver} disabled={currentStep === 1 && !hasBooking} className="relative flex items-center md:space-x-2 shrink-0 group transition">
          <StepCircle number="1" active={currentStep === 1} complete={currentStep > 1} />
          <StepLabel active={currentStep >= 1} position="left-0">เลือกทริป</StepLabel>
        </button>
        <StepConnector complete={currentStep > 1} />
        <button onClick={onChooseVan} disabled={currentStep <= 2 || hasBooking} className="relative flex items-center md:space-x-2 shrink-0 group transition">
          <StepCircle number="2" active={currentStep === 2} complete={currentStep > 2} />
          <StepLabel active={currentStep >= 2} position="left-1/2 -translate-x-1/2">เลือกรถตู้</StepLabel>
        </button>
        <StepConnector complete={currentStep > 2} />
        <button onClick={onChooseSeat} disabled={currentStep <= 3 || hasBooking} className="relative flex items-center md:space-x-2 shrink-0 group transition">
          <StepCircle number="3" active={currentStep === 3} complete={currentStep > 3} />
          <StepLabel active={currentStep >= 3} position="left-1/2 -translate-x-1/2">เลือกที่นั่ง</StepLabel>
        </button>
        <StepConnector complete={currentStep > 3} />
        <div className="relative flex items-center md:space-x-2 shrink-0">
          <StepCircle number="4" active={currentStep === 4} complete={currentStep > 4} />
          <StepLabel active={currentStep >= 4} position="left-1/2 -translate-x-1/2">กรอกข้อมูล</StepLabel>
        </div>
        <StepConnector complete={currentStep > 4} />
        <div className="relative flex items-center md:space-x-2 shrink-0">
          <StepCircle number="5" active={currentStep === 5} complete={currentStep > 5} />
          <StepLabel active={currentStep === 5} position="right-0">ยืนยันการจอง</StepLabel>
        </div>
      </div>
    </section>
  );
}

function StepCircle({ number, active, complete }: { number: string; active: boolean; complete: boolean }) {
  return <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition ${active ? 'bg-brand-700 ring-4 ring-purple-100' : complete ? 'bg-brand-700' : 'bg-slate-200'}`}>{complete ? <Check className="w-4 h-4" /> : number}</div>;
}

function StepLabel({ active, position, children }: { active: boolean; position: string; children: React.ReactNode }) {
  return <span className={`absolute top-10 md:static md:top-auto text-[10px] md:text-sm whitespace-nowrap transition ${active ? 'text-brand-700' : ''} ${position}`}>{children}</span>;
}

function StepConnector({ complete }: { complete: boolean }) {
  return <div className={`flex-1 h-0.5 mx-2 min-w-[10px] ${complete ? 'bg-brand-700' : 'bg-slate-200'}`} />;
}
