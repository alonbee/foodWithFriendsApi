import jwt from 'jwt-simple';
import dotenv from 'dotenv';
import User from '../models/user_model';
import MatchModel from '../models/match_model';

dotenv.config({ silent: true });

export const signin = (req, res, next) => {
  res.send({ token: tokenForUser(req.user) });
};

export const signup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const fullname = req.body.fullname;

  if (!email || !password || !fullname) {
    return res.status(422).send('You must fill up all fields!');
  }
  // do a mongo query to find if a user already exists with this email.
  // if user exists then return an error. If not, use the User model to create a new user.
  User.findOne({ email }).then((result) => {
    if (result != null) { return res.status(422).send('You already have an account!'); } else {
      const user = new User({
        fullname,
        email,
        password,
      });
    // Save the new User object
      user.save().then((newUser) => {
        res.json({ token: tokenForUser(user) });
      }).catch((err) => {
        return next(err);
      });
    }
    // and then return a token like the same as you did in in signin
  }).catch((error) => {
    console.log('in user_controller signup error catch');
      // res.status(500).json({ error });
    return next(error);
  });
};

// pass interests and user id
// pass profile image url as well
export const updateInterest = (req, res, next) => {
  const interests = req.body.interests;
  const profileImage = req.body.profile_image;
  const userID = req.user._id;

  if (!interests && !profileImage) {
    return res.status(422).send('You must provide interests or profileImage');
  }
  // do a mongo query to find if a user already exists with this email.
  // if user exists then return an error. If not, use the User model to create a new user.
  User.findOne({ _id: userID }).then((result) => {
    if (result != null) {
      result.interests = interests;
      result.profile_image = profileImage;
      console.log(profileImage);
      result.save()
      .then((resu) => {
        res.json(resu);
      }).catch((error) => {
        res.status(500).json({ error });
      });
    } else {
      return res.status(422).send('Cannot find user account!');
    }
  }).catch((error) => {
    console.log('in user_controller updateInterest error catch');
    return next(error);
  });
};

export const getMatchHistory = (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(422).send('In user_controller and need user object!');
  }
  if (user.match_history === []) {
    return res.status(422).send('User has no matches!');
  }
  MatchModel.find({ _id: { $in: user.match_history } }).then((result) => {
    console.log(`Requesting the match_history, result = ${result}`);
    res.json(result);
  }).catch((error) => {
    console.log('in user_controller getMatchHistory error catch');
  });
};

export const getProfile = (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(422).send('In user_controller and need user object!');
  }
  User.find({ _id: req.user.id }).then((result) => {
    res.json(result);
  }).catch((error) => {
    console.log('in user_controller get profile error catch');
  });
};

// get profile information about another userID
// REQUIRES PROVIDING "userID" IN URL
// only returns fullname and interests
export const getOtherProfile = (req, res) => {
  User.findById(req.params.someID).then((result) => {
    if (result != null) {
      const cleanedUser = result.cleanUser();
      res.json(cleanedUser);
    } else {
      return res.status(422).send('Cannot find other users account!');
    }
  }).catch((error) => {
    console.log('in user_controller getOtherProfile error catch');
  });
};


// takes req.body.fullname
export const updateName = (req, res, next) => {
  const fullname = req.body.fullname;
  const userID = req.user._id;

  if (!fullname) {
    return res.status(422).send('Please provide a fullname');
  }
  User.findOne({ _id: userID }).then((result) => {
    if (result != null) {
      result.fullname = fullname;
      result.save()
      .then((resu) => {
        res.json(resu);
      }).catch((error) => {
        res.status(500).json({ error });
      });
    } else {
      return res.status(422).send('Cannot find user account!');
    }
  }).catch((error) => {
    console.log('in user_controller updateName error catch');
    return next(error);
  });
};

// NEED A RATING FROM THE FRONTEND
export const updateRatings = (req, res, next) => {
  const userID = req.user._id;
  const rating = req.body.rating;

  if (!rating) {
    return res.status(422).send('You must provide rating');
  }
  User.findOne({ _id: userID }).then((result) => {
    if (result != null) {
      result.ratings = result.ratings.concat(rating);
      result.save()
      .then((resu) => {
        res.json(resu);
      }).catch((error) => {
        res.status(500).json({ error });
      });
    } else {
      return res.status(422).send('Cannot find user account!');
    }
  }).catch((error) => {
    console.log('in user_controller updateRatings error catch');
  });
};

// encodes a new token for a user object
function tokenForUser(user) {
  const timestamp = new Date().getTime();
  return jwt.encode({ sub: user.id, iat: timestamp }, process.env.AUTH_SECRET);
}
