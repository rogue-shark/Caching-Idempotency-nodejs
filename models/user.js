import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
  });
  
  // Create a mongoose model
 export default mongoose.model('User', userSchema);