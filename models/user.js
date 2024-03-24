import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
  });
  
  // Create a mongoose model
 export default mongoose.model('User', userSchema);