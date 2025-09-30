import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { Admin } from '../src/models/Admin';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { bufferCommands: false });

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@forum-ensa.tet';
  const name = process.env.SEED_ADMIN_NAME || 'Administrator';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log('Admin already exists:', email);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.create({ email, name, passwordHash });
  console.log('Admin created:', email);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});


