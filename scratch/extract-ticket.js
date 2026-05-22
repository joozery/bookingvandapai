const fs = require('fs');
const path = '/Volumes/Back up data Devjuu/bookingvan/src/app/page.tsx';

const content = fs.readFileSync(path, 'utf8');

const startStr = `<div ref={ticketRef} className="relative w-full max-w-[380px] mx-auto bg-white rounded-[20px] overflow-hidden shadow-xl border border-slate-100 flex flex-col font-sans select-none">`;
const endStr = `{/* Pending Transfer Banner */}`;

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  let jsx = content.substring(startIndex, endIndex);
  
  // Replace `userBooking` with `booking`
  jsx = jsx.replace(/userBooking/g, 'booking');

  const componentStr = `
import React, { forwardRef } from 'react';
import { Calendar, ArrowRight, User, Phone, RefreshCw, Compass, Armchair, MapPin, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export interface BookingData {
  id: string;
  tripName?: string;
  durationDays?: number;
  pickupPoint?: string;
  departureDate?: string;
  departureTime?: string;
  vanNumber?: number;
  seatLabel?: string;
  seatId?: string;
  cost?: number;
  nickname?: string;
  fullName?: string;
  phone?: string;
  driverName?: string;
  driverPhone?: string;
  plateNumber?: string;
  note?: string;
  status?: string;
  pendingTransfer?: any;
}

interface Props {
  booking: BookingData;
  ticketRef?: React.RefObject<HTMLDivElement>;
  htmlId?: string;
}

const parsePlate = (plate?: string) => {
  if (!plate) return { number: '-', province: '-' };
  const parts = plate.trim().split(/\\s+/);
  const number = parts[0] || '-';
  const province = parts.slice(1).join(' ') || 'กรุงเทพ';
  return { number, province };
};

const getReturnDate = (depDate: string, days: number) => {
  if (!depDate) return '';
  return depDate;
};

export const DigitalTicket = forwardRef<HTMLDivElement, Props>(({ booking, htmlId }, ref) => {
  return (
    ${jsx.trim().replace('<div ref={ticketRef}', '<div id={htmlId} ref={ref}')}
  );
});

export default DigitalTicket;
`;

  fs.writeFileSync('/Volumes/Back up data Devjuu/bookingvan/src/components/DigitalTicket.tsx', componentStr);
  console.log('DigitalTicket.tsx created successfully');
} else {
  console.log('Could not find start/end indices');
}
