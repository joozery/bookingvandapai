const { Client } = require('pg');

const regions = [
  'ap-southeast-1', // Singapore
  'ap-southeast-2', // Sydney
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'ap-south-1',     // Mumbai
  'us-east-1',      // N. Virginia
  'us-east-2',      // Ohio
  'us-west-1',      // N. California
  'us-west-2',      // Oregon
  'eu-west-1',      // Ireland
  'eu-west-2',      // London
  'eu-west-3',      // Paris
  'eu-central-1',   // Frankfurt
  'ca-central-1',   // Canada Central
  'sa-east-1'       // São Paulo
];

const password = 'Devwooyou@291996';
const tenant = 'iinwvcgucbixmxecibxg';

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const connectionString = `postgres://postgres.${tenant}:${encodeURIComponent(password)}@${host}:6543/postgres`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000 // 5 seconds timeout
  });

  try {
    await client.connect();
    await client.end();
    return { region, success: true, host };
  } catch (error) {
    return { region, success: false, error: error.message };
  }
}

async function main() {
  console.log('Testing Supabase regions to find your database location...');
  const promises = regions.map(testRegion);
  const results = await Promise.all(promises);

  const successful = results.find(r => r.success);
  if (successful) {
    console.log(`\n🎉 Found region! Your project is located in: ${successful.region}`);
    console.log(`Pooler Host: ${successful.host}`);
  } else {
    console.log('\n❌ Could not connect to any pooler region. Errors:');
    results.forEach(r => {
      console.log(`- ${r.region}: ${r.error}`);
    });
  }
}

main();
