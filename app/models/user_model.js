import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';


const UserSchema = new Schema({
  email: { type: String, unique: true, lowercase: true },
  password: String,
  fullname: String,
  profile_image: String,

  // your active request
  current_request: { type: Schema.Types.ObjectId, ref: 'Request', default: null },
  // your request that has been matched
  my_matched_request: { type: Schema.Types.ObjectId, ref: 'PastRequest', default: null },
  // request of the user you've been matched with
  other_matched_request: { type: Schema.Types.ObjectId, ref: 'PastRequest', default: null },
  // store the various chatrooms a user is involved in
  chatroom: [],
  // will be an array of ratings
  ratings: [],
  // your past requests
  request_history: [],
  // your past matches
  match_history: [],
  // your interests
  interests: [],
  matched_socket: String,
  chat_socket: String,
}, {
  toJSON: {
    virtuals: true,
  },
});

UserSchema.pre('save', function beforeUserSave(next) {
  const user = this;

  if (!user.isModified('password')) { return next(); }

  bcrypt.genSalt(10, (err, salt) => {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

// remove sensitive information from UserSchema, for when looking to view
// the profile of a matched user -- used in getOtherProfile
UserSchema.methods.cleanUser = function cleanUser(user) {
  return { _id: this._id, fullname: this.fullname, interests: this.interests, profile_image: this.profile_image };
};

// check if passport is correct
UserSchema.methods.comparePassword = function comparePassword(candidatePassword, callback) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) return callback(err);
    return callback(null, isMatch);
  });
};

const UserModel = mongoose.model('User', UserSchema);

export default UserModel;
