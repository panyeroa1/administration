
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase URL or Key in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase Connection & Full Schema...');
  
  const tables = [
      'listings', 
      'leads', 
      'properties', 
      'tasks', 
      'tickets', 
      'agents', 
      'interactions',
      'profiles'
  ];

  for (const table of tables) {
      console.log(`\n--- Testing Table: ${table} ---`);
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
          console.error(`❌ Error fetching ${table}:`, error.message, error.code);
      } else {
          console.log(`✅ ${table} fetch successful.`);
          console.log(`   Count: ${data?.length}`);
          if (data && data.length > 0) {
              console.log(`   Sample Data:`, JSON.stringify(data[0]).substring(0, 100) + '...');
          } else {
              console.log(`   (Table is empty but accessible)`);
          }
      }
  }
}

testConnection();
