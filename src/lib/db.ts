import fs from 'fs';
import path from 'path';

// Define the absolute path for DB file
const DB_DIR = path.join(process.cwd(), 'src', 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

export interface Seat {
  id: string;
  label: string;
  type: 'driver' | 'staff' | 'customer';
  status: 'available' | 'pending' | 'booked';
  staffName?: string;
  bookingId?: string | null;
  passengerName?: string;
  row: number;
  col: number; // 3 = top, 2 = middle, 1 = bottom
}

export interface Van {
  id: string;
  tripId: string;
  vanNumber: number; // 1, 2, 3...
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
  image?: string;
  tripPeriod?: string;
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
}

export interface DatabaseSchema {
  trips: Trip[];
  vans: Van[];
  bookings: Booking[];
}

// Helper to generate default seats for a van (Exactly matches 11-seat layout from screenshot)
export function generateSeatsForVan(vanId: string): Seat[] {
  const seats: Seat[] = [];
  
  // Row 1: Staff (Col 1 - bottom), Empty (Col 2 - aisle), Driver D (Col 3 - top)
  seats.push({
    id: `${vanId}-seat-driver`,
    label: 'D',
    type: 'driver',
    status: 'booked',
    row: 1,
    col: 3
  });
  seats.push({
    id: `${vanId}-seat-staff`,
    label: '1',
    type: 'staff',
    status: 'available',
    staffName: 'สตาฟ',
    row: 1,
    col: 1
  });

  // Row 2: Seat 2 (Col 3 - top), Seat 3 (Col 2 - middle), Seat 4 (Col 1 - bottom)
  seats.push({ id: `${vanId}-seat-2`, label: '2', type: 'customer', status: 'available', row: 2, col: 3 });
  seats.push({ id: `${vanId}-seat-3`, label: '3', type: 'customer', status: 'available', row: 2, col: 2 });
  seats.push({ id: `${vanId}-seat-4`, label: '4', type: 'customer', status: 'available', row: 2, col: 1 });

  // Row 3: Seat 5 (Col 3 - top), Seat 6 (Col 2 - middle), Seat 7 (Col 1 - bottom)
  seats.push({ id: `${vanId}-seat-5`, label: '5', type: 'customer', status: 'available', row: 3, col: 3 });
  seats.push({ id: `${vanId}-seat-6`, label: '6', type: 'customer', status: 'available', row: 3, col: 2 });
  seats.push({ id: `${vanId}-seat-7`, label: '7', type: 'customer', status: 'available', row: 3, col: 1 });

  // Row 4: Seat 8 (Col 3 - top), Seat 9 (Col 2 - middle), Seat 10 (Col 1 - bottom)
  seats.push({ id: `${vanId}-seat-8`, label: '8', type: 'customer', status: 'available', row: 4, col: 3 });
  seats.push({ id: `${vanId}-seat-9`, label: '9', type: 'customer', status: 'available', row: 4, col: 2 });
  seats.push({ id: `${vanId}-seat-10`, label: '10', type: 'customer', status: 'available', row: 4, col: 1 });

  return seats;
}

// Initial default data matching the screenshot exactly
export const initialData: DatabaseSchema = {
  trips: [
    {
      id: 'trip-1',
      name: 'ดอยหลวงเชียงดาว',
      departureDate: '15 ธ.ค. 67',
      durationDays: 3,
      cost: 3500,
      pickupPoint: 'จุดนัดพบ ปั๊ม ปตท.',
      departureTime: '06:00',
      status: 'active',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&auto=format&fit=crop&q=80',
      tripPeriod: '16-18 ธ.ค. 67'
    },
    {
      id: 'trip-2',
      name: 'เขาช้างเผือก',
      departureDate: '22 ธ.ค. 67',
      durationDays: 2,
      cost: 2900,
      pickupPoint: 'จุดนัดพบ ปั๊ม ปตท.',
      departureTime: '06:00',
      status: 'active',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&auto=format&fit=crop&q=80',
      tripPeriod: '23-24 ธ.ค. 67'
    },
    {
      id: 'trip-3',
      name: 'ดอยอินทนนท์',
      departureDate: '29 ธ.ค. 67',
      durationDays: 3,
      cost: 3200,
      pickupPoint: 'จุดนัดพบ ปั๊ม ปตท.',
      departureTime: '06:00',
      status: 'active',
      image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&auto=format&fit=crop&q=80',
      tripPeriod: '30 ธ.ค. - 1 ม.ค. 68'
    }
  ],
  vans: [
    {
      id: 'van-trip-1-1',
      tripId: 'trip-1',
      vanNumber: 1,
      plateNumber: 'รถตู้คันที่ 1 (11 ที่นั่ง)',
      driverName: 'นนท์',
      driverPhone: '081-234-5678',
      seats: []
    },
    {
      id: 'van-trip-1-2',
      tripId: 'trip-1',
      vanNumber: 2,
      plateNumber: 'รถตู้คันที่ 2 (11 ที่นั่ง)',
      driverName: 'อาร์ท',
      driverPhone: '089-876-5432',
      seats: []
    },
    {
      id: 'van-trip-2-1',
      tripId: 'trip-2',
      vanNumber: 1,
      plateNumber: 'รถตู้คันที่ 1 (11 ที่นั่ง)',
      driverName: 'นนท์',
      driverPhone: '085-555-4433',
      seats: []
    },
    {
      id: 'van-trip-3-1',
      tripId: 'trip-3',
      vanNumber: 1,
      plateNumber: 'รถตู้คันที่ 1 (11 ที่นั่ง)',
      driverName: 'สมศักดิ์',
      driverPhone: '082-111-2233',
      seats: []
    }
  ],
  bookings: []
};

// Initialize seats for the default vans
initialData.vans.forEach(van => {
  van.seats = generateSeatsForVan(van.id);
});

export function getDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(DB_FILE)) {
      writeDb(initialData);
      return initialData;
    }
    
    const fileContent = fs.readFileSync(DB_FILE, 'utf8');
    if (!fileContent.trim()) {
      writeDb(initialData);
      return initialData;
    }
    
    return JSON.parse(fileContent) as DatabaseSchema;
  } catch (error) {
    console.error('Error reading database file:', error);
    return initialData;
  }
}

export function writeDb(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to database file:', error);
  }
}
