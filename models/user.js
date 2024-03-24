import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
  });
  
  // Create a mongoose model
 export default User = mongoose.model('User', userSchema);