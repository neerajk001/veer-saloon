import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Service from './models/service';
import SaloonConfig from './models/saloonConfig';

dotenv.config();

const seedData = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoURI);
    console.log('📦 Connected to MongoDB');

    // Clear existing data
    await Service.deleteMany({});
    await SaloonConfig.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Seed Services - Fixed services with fixed durations
    const services = [
      {
        name: 'Haircut',
        price: 300,
        duration: 25,
        isAcitve: true
      },
      {
        name: 'Haircut + Beard',
        price: 500,
        duration: 35,
        isAcitve: true
      },
      {
        name: 'Beard Trimming',
        price: 150,
        duration: 20,
        isAcitve: true
      },
      {
        name: 'Facial + Massage',
        price: 400,
        duration: 20,
        isAcitve: true
      }
    ];

    const createdServices = await Service.insertMany(services);
    console.log(`✅ Created ${createdServices.length} services`);

    // Seed Saloon Config
    const config = await SaloonConfig.create({
      morningSlot: {
        openingTime: '09:00',
        closingTime: '14:00'
      },
      eveningSlot: {
        openingTime: '16:00',
        closingTime: '22:00'
      },
      daysOff: [] // No days off by default
    });
    console.log('✅ Created saloon configuration');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\nSample Data:');
    console.log('- Services:', createdServices.length);
    console.log('- Morning Slot:', config.morningSlot?.openingTime, '-', config.morningSlot?.closingTime);
    console.log('- Evening Slot:', config.eveningSlot?.openingTime, '-', config.eveningSlot?.closingTime);
    console.log('- Days Off:', config.daysOff.length > 0 ? config.daysOff.join(', ') : 'None');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
