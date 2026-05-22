const fs = require('fs');

const pagePath = '/Volumes/Back up data Devjuu/bookingvan/src/app/page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');

const startStr = `<div ref={ticketRef} className="relative w-full max-w-[380px] mx-auto bg-white rounded-[20px] overflow-hidden shadow-xl border border-slate-100 flex flex-col font-sans select-none">`;
const endStr = `              {/* Pending Transfer Banner */}`;

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  let ticketJsx = content.substring(startIndex, endIndex);
  
  // Replace `userBooking` with `b`
  let functionJsx = ticketJsx.replace(/userBooking/g, 'b');
  
  // Update ref to be dynamic
  functionJsx = functionJsx.replace(
    `<div ref={ticketRef} className="relative w-full max-w-[380px] mx-auto bg-white rounded-[20px] overflow-hidden shadow-xl border border-slate-100 flex flex-col font-sans select-none">`,
    `<div id={\`ticket-card-\${b.id}\`} ref={isMain ? ticketRef : null} className="relative w-full max-w-[380px] mx-auto bg-white rounded-[20px] overflow-hidden shadow-xl border border-slate-100 flex flex-col font-sans select-none">`
  );

  const functionDef = `
  const renderTicketCard = (b: any, isMain: boolean = false) => {
    return (
      <>
        ${functionJsx.trim()}
        {/* Pending Transfer Banner */}
        {(b as any).pendingTransfer && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 animate-in fade-in duration-300 mt-4">
            <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <RefreshCw className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-amber-800 leading-tight">
                ขอย้ายที่นั่งไปที่ เบาะ {(b as any).pendingTransfer.seatLabel} — รออนุมัติจากแอดมิน
              </p>
              <p className="text-[10px] text-amber-600 mt-0.5">คำขอจะถูกอนุมัติหรือปฏิเสธโดยแอดมิน</p>
            </div>
            <button
              onClick={() => handleCancelBooking((b as any).pendingTransfer.id)}
              className="shrink-0 text-[10px] font-bold text-amber-700 hover:text-rose-600 underline transition"
            >
              ยกเลิก
            </button>
          </div>
        )}
      </>
    );
  };
`;

  // Insert function right before `return (` of the main component
  const returnIndex = content.lastIndexOf('  return (');
  content = content.slice(0, returnIndex) + functionDef + content.slice(returnIndex);

  // Replace the original JSX block with a call to the function
  const origBlockEndIndex = content.indexOf(`              {/* Action buttons */}`);
  
  const beforeBlock = content.substring(0, startIndex);
  const afterBlock = content.substring(origBlockEndIndex);

  content = beforeBlock + `              {renderTicketCard(userBooking, true)}\n` + afterBlock;
  
  fs.writeFileSync(pagePath, content, 'utf8');
  console.log('Refactoring complete!');
} else {
  console.log('Could not find start or end index.');
}
