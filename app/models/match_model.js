import mongoose, { Schema } from 'mongoose';

const MatchSchema = new Schema({
  match_time: { type: Date, default: Date.now },
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

const MatchModel = mongoose.model('Match', MatchSchema);

export default MatchModel;
