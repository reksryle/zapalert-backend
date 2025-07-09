require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models'); // Adjust the path to your User model

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'Account',
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      status: 'approved',
      idImagePath: 'uploads/admin.png', // dummy path; you can change or leave blank
      submittedAt: new Date(),
    });

    await adminUser.save();

    console.log('✅ Admin user created with username: "admin" and password: "admin123"');
    process.exit(0);

  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
