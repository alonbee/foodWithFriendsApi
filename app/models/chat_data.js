import mongoose, { Schema } from 'mongoose';

const ChatSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  text: String,
  created_at: { type: Date, default: Date.now },
  roomID: String,
}, {
  toJSON: {
    virtuals: true,
  },
});

const ChatModel = mongoose.model('Chat', ChatSchema);

export default ChatModel;
