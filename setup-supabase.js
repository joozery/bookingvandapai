const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = 'postgres://postgres.iinwvcgucbixmxecibxg:Devwooyou@291996@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function main() {
  console.log('Connecting to Supabase Database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    // 1. Create Tables
    console.log('Creating tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        "departureDate" TEXT NOT NULL,
        "durationDays" INTEGER NOT NULL,
        cost INTEGER NOT NULL,
        "pickupPoint" TEXT NOT NULL,
        "departureTime" TEXT NOT NULL,
        "tripPeriod" TEXT,
        image TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vans (
        id TEXT PRIMARY KEY,
        "tripId" TEXT REFERENCES trips(id) ON DELETE CASCADE,
        "vanNumber" INTEGER NOT NULL,
        "plateNumber" TEXT,
        "driverName" TEXT,
        "driverPhone" TEXT,
        seats JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        "tripId" TEXT REFERENCES trips(id) ON DELETE CASCADE,
        "vanId" TEXT REFERENCES vans(id) ON DELETE CASCADE,
        "seatId" TEXT NOT NULL,
        "seatLabel" TEXT NOT NULL,
        nickname TEXT NOT NULL,
        "fullName" TEXT NOT NULL,
        phone TEXT NOT NULL,
        "lineUserId" TEXT NOT NULL,
        "lineUserName" TEXT NOT NULL,
        "lineUserProfilePic" TEXT,
        status TEXT DEFAULT 'pending',
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "checkedIn" BOOLEAN DEFAULT FALSE,
        "checkedInAt" TIMESTAMPTZ,
        "replacesBookingId" TEXT,
        note TEXT
      );
    `);

    console.log('Disabling RLS on tables...');
    await client.query('ALTER TABLE trips DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE vans DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;');

    // 2. Setup Storage Bucket and RLS policies in Supabase
    console.log('Setting up Storage bucket...');
    await client.query(`
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('images', 'images', true) 
      ON CONFLICT (id) DO NOTHING;
    `);

    // Enable RLS on storage.objects if not enabled, or just add policies
    console.log('Creating storage access policies...');
    try {
      await client.query(`
        CREATE POLICY "Allow public select on images" 
        ON storage.objects FOR SELECT 
        USING (bucket_id = 'images');
      `);
    } catch (e) {
      console.log('Select policy might already exist.');
    }

    try {
      await client.query(`
        CREATE POLICY "Allow public insert on images" 
        ON storage.objects FOR INSERT 
        WITH CHECK (bucket_id = 'images');
      `);
    } catch (e) {
      console.log('Insert policy might already exist.');
    }

    try {
      await client.query(`
        CREATE POLICY "Allow public update on images" 
        ON storage.objects FOR UPDATE 
        USING (bucket_id = 'images');
      `);
    } catch (e) {
      console.log('Update policy might already exist.');
    }

    try {
      await client.query(`
        CREATE POLICY "Allow public delete on images" 
        ON storage.objects FOR DELETE 
        USING (bucket_id = 'images');
      `);
    } catch (e) {
      console.log('Delete policy might already exist.');
    }

    // 3. Populate initial data if tables are empty
    const tripsCountRes = await client.query('SELECT COUNT(*) FROM trips;');
    const tripsCount = parseInt(tripsCountRes.rows[0].count, 10);

    if (tripsCount === 0) {
      console.log('Populating initial data...');
      
      const tripsData = [
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
      ];

      for (const trip of tripsData) {
        await client.query(`
          INSERT INTO trips (id, name, "departureDate", "durationDays", cost, "pickupPoint", "departureTime", "tripPeriod", image, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `, [trip.id, trip.name, trip.departureDate, trip.durationDays, trip.cost, trip.pickupPoint, trip.departureTime, trip.tripPeriod, trip.image, trip.status]);
      }

      // Generate Seats Helper
      function generateSeatsForVan(vanId) {
        const seats = [];
        seats.push({ id: `${vanId}-seat-driver`, label: 'D', type: 'driver', status: 'booked', row: 1, col: 3 });
        seats.push({ id: `${vanId}-seat-staff`, label: '1', type: 'staff', status: 'available', staffName: 'สตาฟ', row: 1, col: 1 });
        seats.push({ id: `${vanId}-seat-2`, label: '2', type: 'customer', status: 'available', row: 2, col: 3 });
        seats.push({ id: `${vanId}-seat-3`, label: '3', type: 'customer', status: 'available', row: 2, col: 2 });
        seats.push({ id: `${vanId}-seat-4`, label: '4', type: 'customer', status: 'available', row: 2, col: 1 });
        seats.push({ id: `${vanId}-seat-5`, label: '5', type: 'customer', status: 'available', row: 3, col: 3 });
        seats.push({ id: `${vanId}-seat-6`, label: '6', type: 'customer', status: 'available', row: 3, col: 2 });
        seats.push({ id: `${vanId}-seat-7`, label: '7', type: 'customer', status: 'available', row: 3, col: 1 });
        seats.push({ id: `${vanId}-seat-8`, label: '8', type: 'customer', status: 'available', row: 4, col: 3 });
        seats.push({ id: `${vanId}-seat-9`, label: '9', type: 'customer', status: 'available', row: 4, col: 2 });
        seats.push({ id: `${vanId}-seat-10`, label: '10', type: 'customer', status: 'available', row: 4, col: 1 });
        return seats;
      }

      const vansData = [
        {
          id: 'van-trip-1-1',
          tripId: 'trip-1',
          vanNumber: 1,
          plateNumber: 'รถตู้คันที่ 1 (11 ที่นั่ง)',
          driverName: 'นนท์',
          driverPhone: '081-234-5678'
        },
        {
          id: 'van-trip-1-2',
          tripId: 'trip-1',
          vanNumber: 2,
          plateNumber: 'รถตู้คันที่ 2 (11 ที่นั่ง)',
          driverName: 'อาร์ท',
          driverPhone: '089-876-5432'
        },
        {
          id: 'van-trip-2-1',
          tripId: 'trip-2',
          vanNumber: 1,
          plateNumber: 'รถตู้คันที่ 1 (11 ที่นั่ง)',
          driverName: 'นนท์',
          driverPhone: '085-555-4433'
        },
        {
          id: 'van-trip-3-1',
          tripId: 'trip-3',
          vanNumber: 1,
          plateNumber: 'รถตู้คันที่ 1 (11 ที่นั่ง)',
          driverName: 'สมศักดิ์',
          driverPhone: '082-111-2233'
        }
      ];

      for (const van of vansData) {
        const seats = generateSeatsForVan(van.id);
        await client.query(`
          INSERT INTO vans (id, "tripId", "vanNumber", "plateNumber", "driverName", "driverPhone", seats)
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [van.id, van.tripId, van.vanNumber, van.plateNumber, van.driverName, van.driverPhone, JSON.stringify(seats)]);
      }

      console.log('Initial data populated successfully!');
    } else {
      console.log('Tables already have data. Skipping population.');
    }

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up Supabase Database:', error);
  } finally {
    await client.end();
  }
}

main();
