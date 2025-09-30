import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Admin } from '../src/models/Admin';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check for users
    const users = await User.find().lean();
    console.log(`Found ${users.length} users:`);
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`- ${user.email} (${user.role}, isCommittee: ${user.isCommittee})`);
      });
    } else {
      console.log('No users found. Creating a test user...');
      
      // Create a test user
      const passwordHash = await import('bcryptjs').then(bcrypt => bcrypt.hash('password123', 10));
      await User.create({
        name: 'Test Student',
        email: 'student@test.com',
        passwordHash,
        role: 'student',
        status: 'ENSA',
        opportunityType: 'PFE',
        isCommittee: false
      });
      console.log('Test student created with email: student@test.com and password: password123');
      
      // Create a committee member
      await User.create({
        name: 'Test Committee',
        email: 'committee@test.com',
        passwordHash,
        role: 'committee',
        isCommittee: true
      });
      console.log('Test committee created with email: committee@test.com and password: password123');
    }

    // Check for admins
    const admins = await Admin.find().lean();
    console.log(`Found ${admins.length} admins:`);
    if (admins.length > 0) {
      admins.forEach(admin => {
        console.log(`- ${admin.email}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();

