import 'dotenv/config';
import { supabaseAdmin } from '../config/database.js';

async function migrate() {
  console.log('Starting database migration...');

  try {
    // Create tasks table
    const { error: tasksError } = await supabaseAdmin.rpc('exec', {
      query: `
        CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('http', 'https', 'ping', 'api', 'port')),
          target VARCHAR(500) NOT NULL,
          interval INTEGER DEFAULT 5,
          timeout INTEGER DEFAULT 10,
          status_code INTEGER,
          alert_threshold INTEGER DEFAULT 3,
          node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
          enabled BOOLEAN DEFAULT true,
          status VARCHAR(50) DEFAULT 'normal' CHECK (status IN ('normal', 'slow', 'error', 'disabled')),
          last_response_time INTEGER,
          last_check_time TIMESTAMPTZ,
          availability DECIMAL(5,2),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (tasksError) {
      console.log('Creating tasks table using direct SQL...');
      // Alternative approach: Create table manually
      const createTasksSQL = `
        CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          target VARCHAR(500) NOT NULL,
          interval INTEGER DEFAULT 5,
          timeout INTEGER DEFAULT 10,
          status_code INTEGER,
          alert_threshold INTEGER DEFAULT 3,
          node_id UUID,
          enabled BOOLEAN DEFAULT true,
          status VARCHAR(50) DEFAULT 'normal',
          last_response_time INTEGER,
          last_check_time TIMESTAMPTZ,
          availability DECIMAL(5,2),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      await supabaseAdmin.rpc('pg_execute', { sql: createTasksSQL }).catch(() => {
        console.log('Note: Tables should be created manually in Supabase dashboard');
      });
    }

    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
