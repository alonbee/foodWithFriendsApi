import dotenv from 'dotenv';
import Request from '../models/request_model';
import User from '../models/user_model';
import MatchModel from '../models/match_model';
// import socketio from 'socket.io';
// import socketioJwt from 'socketio-jwt';

dotenv.config({ silent: true });

// const app = require('../server');
// const io = app.io;

// function locationFiltering() {
// }

function instantMatchQuery(request, res, next) {
  // NOTE: time in request must be ISO formate
  const query = { $or: [{ start_time: { $gte: request.start_time, $lte: request.end_time } }, { end_time: { $gte: request.start_time, $lte: request.end_time } }, { start_time: { $lte: request.start_time }, end_time: { $gte: request.end_time } }], User: { $ne: request.User } };

  // NOTE: Mongoose doesn't transform query values according to schemas; In other words, make sure the time is already in ISO formate. Sort by time;
  Request.find(query, null, { sort: 'start_time' }, (err, timeMatches) => {
    if (err) console.log(err);

    console.log('Printing all matches');
    console.log(timeMatches);

    if (timeMatches.length > 0) {
      const bestMatch = timeMatches[0];  // Closest time
      const roomID = `${request.User}${bestMatch.User}`;
      // const io = request.app.get('io');
      // io.socket.emit('foundMatchResult', bestMatch);
      console.log(`Get matched! roomID = ${roomID}`);
      User.findById(request.User).then((result) => {
        if (result != null) {
          const socket = result.client_socket;
          io.to(socket).emit('foundMatchResult', bestMatch);
        } else {
          return res.status(422).send('Cannot find other users account!');
        }
      }).catch((error) => {
        console.log('in match_controller instantMatchQuery error catch');
      });

      // Add selfRequest and other Request to the MatchModel. Remove them from the request.
      // Update two users' my_matched_request, request_history, other_matched_request, match_history
      const currentTime = new Date();
      const matchSelf = new MatchModel();
      matchSelf.match_time = currentTime;
      matchSelf.start_time = request.start_time;
      matchSelf.end_time = request.end_time;
      matchSelf.topic = request.topic;
      matchSelf.loc = request.loc;
      matchSelf.User = request.User;

      matchSelf.save().then((selfNewReq) => {
        const matchOther = new MatchModel();
        matchOther.match_time = currentTime;
        matchOther.start_time = bestMatch.start_time;
        matchOther.end_time = bestMatch.end_time;
        matchOther.topic = bestMatch.topic;
        matchOther.loc = bestMatch.loc;
        matchOther.User = bestMatch.User;

        matchOther.save().then((otherNewReq) => {       // Create two requests in  MatchModel table. Update entries for two uses.
          User.findById(selfNewReq.User, (err, usr) => {
            if (err) {
              console.log(`error in accessing user id=${usr._id}`);
              next(err);
            } else {
                // Push the prev matched request to request history
              if (usr.my_matched_request != null) {
                const prevMatchedRequest = usr.my_matched_request;
                console.log(`printing prev matched request ${prevMatchedRequest}`);
                usr.request_history.push(prevMatchedRequest);
              }

              if (usr.other_matched_request != null) {
                const prevOtherMatchedRequest = usr.other_matched_request;
                usr.match_history.push(prevOtherMatchedRequest);
              }

              usr.chatroom.push(roomID);
              usr.my_matched_request = selfNewReq.id;
              usr.other_matched_request = otherNewReq.id;
              usr.current_request = null;

              usr.save((err, updatedUsr) => {
                if (err) {
                  console.log(`error in accessing user id=${updatedUsr._id}`);
                  next(err);
                } else {
                  console.log('Successfully populate my matched request');
                }
              });
            }
          });

          User.findById(bestMatch.User, (err, usr) => {
            if (err) {
              console.log(`error in accessing user id=${usr._id}`);
              next(err);
            } else {
              if (usr.my_matched_request) {
                const prevMatchedRequest = usr.my_matched_request;
                console.log(`printing prev matched request${prevMatchedRequest}`);
                usr.request_history.push(prevMatchedRequest);
              }

              if (usr.other_matched_request != null) {
                const prevOtherMatchedRequest = usr.other_matched_request;
                usr.match_history.push(prevOtherMatchedRequest);
              }

              usr.chatroom.push(roomID);
              usr.my_matched_request = otherNewReq.id;
              usr.other_matched_request = selfNewReq.id;
              usr.current_request = null;

              usr.save((err, updatedUsr) => {
                if (err) {
                  console.log(`error in accessing user id=${updatedUsr._id}`);
                  next(err);
                } else {
                  console.log('Successfully populate my matched request');
                }
              });
            }
          }).catch((err) => {
            console.log('Error in saving my matched request');
          });
        });
      }).catch((err) => {
        console.log('Error in saving my matched request');
      });


      // Remove two requests from Request table
      Request.findByIdAndRemove(request.id, (err, rst) => {
        if (err) {
          console.log(`error removing the request id = ${request.id}`);
        } else {
          console.log(`Successfully deleted the request id= ${request.id}`);
        }
      });

      Request.findByIdAndRemove(bestMatch.id, (err, rst) => {
        if (err) {
          console.log(`error removing the bestMatch id = ${bestMatch.id}`);
        } else {
          console.log(`Successfully deleted the bestMatch id= ${bestMatch.id}`);
        }
      });
    } else {
      // res.json({ Message: 'No InstaMatch Found. Please wait for 5mins.', InstaMatchedWith: '' });
    }
    // TODO: Multi-threading problem ? -> multiple people get matched with the same guy
  }).catch((error) => {
    console.log('in match_request controller Matching error catch');
      // res.status(500).json({ error });
    next(error);
  });
}

export const createMatchRequest = (req, res, next) => {
  // TODO: Do a geo query
  // Read in parameters of request and handle Instant Request or Schedule a request
  // NOTE: startTime & endTime should be ISO time string like  2017-05-19T04:23:20.328Z --> local time 12:23 EST
  console.log('Printing Request Body');
  console.log(req.body);

  const requestUserID = req.user._id;
  const topic = req.body.topic;
  const location = req.body.loc;
  const startTime = new Date(req.body.start_time);
  const endTime = new Date(req.body.end_time);

  if (!req.body.start_time) {
    return res.status(422).send('Failed! Must have a start time');
  }

  Request.findOne({ User: requestUserID }).then((result) => {
    if (result == null) {
      // Creat new request in the db
      // TODO: Probably use moment.js  ISO String doesn't consider time-zone difference
      const newMatchRequest = new Request();
      newMatchRequest.start_time = startTime;
      newMatchRequest.end_time = endTime;
      newMatchRequest.topic = topic;
      newMatchRequest.loc = location;
      newMatchRequest.User = requestUserID;

      newMatchRequest.save().then((newRequest) => {
        // Add current request to the user model
        console.log(`new request = ${newRequest}`);
        User.findById(requestUserID, (err, user) => {
          if (err) { next(err); }
          user.current_request = newRequest;
          user.save((err, updatedUser) => {
            if (err) {
              console.log('User not found');
              return res.json({ Message: 'Server error!', created: 'NO' });
            } else {
              console.log(`Added current_request for user${updatedUser._id}`);
              return res.json({ Message: 'Creat match request Successfully', created: 'YES' });
            }
          });
        });
        // instantMatchQuery(newMatchRequest, res, next);
      }).catch((err) => {
        console.log('In the error catching of finding request');
        return res.json({ Message: 'Server error!', created: 'NO' });
      });

      // TODO: Perform query by time; Return the current request ID.
    } else {
      return res.json({ Message: 'Failed in creating match request . You have one request in the pool! Remove it before creating a new one', created: 'NO' });
    }
  }).catch((error) => {
    console.log('fail in matchrequest controller');
    return res.json({ Message: 'Server error!', created: 'NO' });
    // next(error);
  });
};

export const updateMatchRequest = (req, res, next) => {
  // NOTE: Client should keep calling this
  const requestUserID = req.user._id;
  User.findById(requestUserID, (err, user) => {
    if (err) {
      console.log('User not found');
      next(err);
    }
    const currentMatchRequest = user.current_request;
    instantMatchQuery(currentMatchRequest, res, next);
  });
};

export const getMatchResultSocketIO = (req, res, next) => {
  // Check if expired. If expired, find the closest guy.
  // Send back both requests info for constructing why you are matched. You expected time. Hist/her expected time.
  console.log(`printing user request with user info${req.user}`);

  Request.findOne({ User: req.user._id }).then((userReq) => {
    if (userReq == null) {
      // Check the past request table; Remove the current match if it's returned.
      User.findById(req.user._id, (err, usr) => {
        const matchResult = usr.other_matched_request;
        if (matchResult != null) {
          res.json({ Message: 'Matched Succesfully', InstaMatchedWith: matchResult });
        } else {
          instantMatchQuery(userReq, res, next);
        }
      });
    } else {
      // Redo an instant search here
      instantMatchQuery(userReq, res, next);
    }
  }).catch((error) => {
    console.log('fail in getMatchResult');
    // return res.json({ Message: 'Server error!', created: 'NO' });
    next(error);
  });
};

export const getMatchResult = (req, res, next) => {
  // Check if expired. If expired, find the closest guy.
  // Send back both requests info for constructing why you are matched. You expected time. Hist/her expected time.
  // Return the closest match for instant match ?

  User.findById(req.user._id, (err, usr) => {
    const matchResult = usr.other_matched_request;
    if (matchResult != null) {
      console.log(`In getMatchResult, match object id: ${matchResult}`);
      MatchModel.findById(matchResult, (err, matchObj) => {
        console.log(`In getMatchResult, match Object content = ${matchObj}`);
        res.json({ Message: 'Matched Succesfully', InstaMatchedWith: matchObj });
        usr.match_history.push(matchResult);
        usr.other_matched_request = null;
        const userSelfRequest = usr.my_matched_request;
        console.log(`In getMatchResult, userSelfRequest = ${userSelfRequest}`);
        if (userSelfRequest != null) {
          usr.request_history.push(userSelfRequest);
        }
        usr.my_matched_request = null;
        usr.save();
      });
    } else {
      Request.findOne({ User: req.user._id }).then((userReq) => {
        if (userReq == null) {
          console.log('In getMatchResult, user current request is null, other_matched_history is null. Do nothing');
        } else {
          console.log('In getMatchResult, user current request is not null, other_matched_history is null. Perform a search');
          instantMatchQuery(userReq, res, next); // doesn't send out results
        }
      });
    }
  });
};

export const removeMatchRequest = (req, res, next) => {
  // Remove request from pool when it's expired. Trigged by client side(expiration) or matched in server(done in the instantMatchQuery func)
  // NOTE: At the time of expiration, client should GET from the removeMatchRequest router.
  // Probably remove in the server side in case the client side is offline.
  console.log(`in remove match request usr = ${req.user}`);
  const userID = req.user.id;

  Request.remove({ User: userID }, (err, rst) => {
    if (err) {
      next(err);
    } else if (rst.result.n === 0) {
      return res.json({ Message: 'User does\'t Current Match Request', removed: 'NO' });
    } else {
      console.log(`rst = ${rst}`);
      req.user.current_request = null;
      req.user.save();
      return res.json({ Message: 'Removed Current Match Request!', removed: 'YES' });
    }
  }).catch((error) => {
    console.log('fail in removeMatchRequest');
    next(error);
  });
};
