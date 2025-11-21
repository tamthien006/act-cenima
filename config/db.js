import mongoose from 'mongoose';
import colors from 'colors';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(colors.cyan.underline(`✅ MongoDB Connected: ${conn.connection.host}`));
    return conn;
  } catch (error) {
    console.error(colors.red.underline.bold(`❌ Error: ${error.message}`));
    process.exit(1);
  }
};

export default connectDB;
