import mongoose, { Schema } from 'mongoose';

const RequestSchema = new Schema({
  start_time: { type: Date, default: Date.now },
  end_time: { type: Date },
  topic: String,
  loc: { type: [Number],  // [<longitude>, <latitude>]
    index: '2d',      // create the geospatial index
  },
  User: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  toJSON: {
    virtuals: true,
  },
});

const RequestModel = mongoose.model('Request', RequestSchema);

export default RequestModel;
