const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/kasturi-ayurveda')
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const appointments = await db.collection('appointments').find({}).toArray();
    
    console.log(`📊 Total Appointments: ${appointments.length}\n`);
    console.log('=== APPOINTMENTS ===\n');
    
    appointments.forEach((apt, index) => {
      console.log(`${index + 1}. ${apt.name}`);
      console.log(`   Phone: ${apt.phone}`);
      console.log(`   Email: ${apt.email || 'Not provided'}`);
      console.log(`   Service: ${apt.service}`);
      console.log(`   Date: ${apt.appointmentDate}`);
      console.log(`   Time: ${apt.appointmentTime}`);
      console.log(`   Status: ${apt.status}`);
      if (apt.symptoms) console.log(`   Symptoms: ${apt.symptoms}`);
      console.log(`   Created: ${apt.createdAt}\n`);
    });
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
