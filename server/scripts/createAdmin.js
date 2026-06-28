require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Bootstrap Admin Script
 *
 * Promotes an existing user to admin by email address.
 * Run after registering a normal account:
 *   node scripts/createAdmin.js user@example.com
 *
 * This is intentionally a CLI-only operation — no HTTP endpoint.
 * You need shell/server access to run it, which is exactly the right
 * security bar for "create the first admin."
 */
const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = process.argv[2];
    if (!email) {
      console.error('Usage: node scripts/createAdmin.js user@example.com');
      process.exit(1);
    }

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { role: 'admin' },
      { new: true }
    );

    if (!user) {
      console.error('No user found with that email — register normally first.');
    } else {
      console.log(`✅ ${user.email} is now an admin (role: ${user.role}).`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
};

run();
