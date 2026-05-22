const fs = require('fs');
const path = '/Volumes/Back up data Devjuu/bookingvan/src/app/page.tsx';

let content = fs.readFileSync(path, 'utf8');

const importStr = `import DigitalTicket from '@/components/DigitalTicket';\n`;
if (!content.includes('import DigitalTicket')) {
  // Add import after other imports
  const importIndex = content.lastIndexOf("import { toPng } from 'html-to-image';");
  content = content.slice(0, importIndex) + importStr + content.slice(importIndex);
}

const startStr = `<div ref={ticketRef} className="relative w-full max-w-[380px] mx-auto bg-white rounded-[20px] overflow-hidden shadow-xl border border-slate-100 flex flex-col font-sans select-none">`;
const endStr = `              {/* Pending Transfer Banner */}`;

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);
  
  content = before + `              <DigitalTicket ref={ticketRef} booking={userBooking as any} htmlId="main-ticket" />\n` + after;
  
  fs.writeFileSync(path, content, 'utf8');
  console.log('page.tsx refactored to use DigitalTicket component!');
} else {
  console.log('Could not find start/end indices in page.tsx');
}
