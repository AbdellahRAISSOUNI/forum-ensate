import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../src/lib/mongodb';
import { Admin } from '../src/models/Admin';

async function createAdmin() {
  try {
    await connectToDatabase();
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({});
    if (existingAdmin) {
      console.log('✅ Admin user already exists:');
      console.log('Email:', existingAdmin.email);
      console.log('Name:', existingAdmin.name || 'Administrator');
      console.log('\n🔑 If you forgot the password, you can reset it by running this script with new credentials.');
      return;
    }

    // Default admin credentials
    const email = 'admin@forum-ensa.tet';
    const name = 'Administrator';
    const password = 'ChangeMe123!';

    const passwordHash = await bcrypt.hash(password, 10);
    
    const admin = await Admin.create({
      email,
      name,
      passwordHash
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', name);
    console.log('\n⚠️  IMPORTANT: Please change this password after first login!');
    console.log('\n🌐 Login at: http://localhost:3000/admin/login');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    process.exit(0);
  }
}

// Allow custom credentials via command line
const customEmail = process.argv[2];
const customPassword = process.argv[3];

if (customEmail && customPassword) {
  console.log('Creating admin with custom credentials...');
  createAdminWithCredentials(customEmail, customPassword);
} else {
  createAdmin();
}

async function createAdminWithCredentials(email: string, password: string) {
  try {
    await connectToDatabase();
    
    // Delete existing admin if any
    await Admin.deleteMany({});
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const admin = await Admin.create({
      email,
      name: 'Administrator',
      passwordHash
    });

    console.log('✅ Admin user created with custom credentials!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('\n🌐 Login at: http://localhost:3000/admin/login');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    process.exit(0);
  }
}
