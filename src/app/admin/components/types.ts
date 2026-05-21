// Shared TypeScript interfaces for admin components

export interface Seat {
  id: string;
  label: string;
  type: 'driver' | 'staff' | 'customer';
  status: 'available' | 'pending' | 'booked';
  staffName?: string;
  bookingId?: string | null;
  row: number;
  col: number;
}

export interface Van {
  id: string;
  tripId: string;
  vanNumber: number;
  plateNumber: string;
  driverName: string;
  driverPhone: string;
  seats: Seat[];
}

export interface Trip {
  id: string;
  name: string;
  departureDate: string;
  durationDays: number;
  cost: number;
  pickupPoint: string;
  departureTime: string;
  status: 'active' | 'completed';
  tripPeriod?: string;
  image?: string;
}

export interface Booking {
  id: string;
  tripId: string;
  vanId: string;
  seatId: string;
  seatLabel: string;
  nickname: string;
  fullName: string;
  phone: string;
  lineUserId: string;
  lineUserName: string;
  lineUserProfilePic: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  replacesBookingId?: string | null;
  note?: string;
  nationalId?: string | null;
  birthDate?: string | null;
  profile?: any;
  // Joined fields
  tripName?: string;
  plateNumber?: string;
  vanNumber?: number;
}
