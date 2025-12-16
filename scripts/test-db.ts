
import { supabase } from '../supabaseClient';

async function testConnection() {
  console.log('Testing Supabase Connection...');
  
  try {
    // Test Listings
    console.log('Fetching listings...');
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*')
      .limit(1);

    if (listingsError) {
      console.error('Error fetching listings:', listingsError.message, listingsError.code);
    } else {
      console.log('Listings fetch successful. Count:', listings?.length);
      console.log('Sample listing:', listings?.[0]);
    }

    // Test Leads (known table)
    console.log('\nFetching leads...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .limit(1);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError.message);
    } else {
      console.log('Leads fetch successful. Count:', leads?.length);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();
