import { Router } from 'express';
import * as UserController from './controllers/user_controller';
import * as matchRequestController from './controllers/matchrequest_controller';
import { requireAuth, requireSignin } from './services/passport';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'welcome to MunchBuddy!' });
});

router.post('/matchRequest', requireAuth, matchRequestController.createMatchRequest);
router.post('/updateMatchRequest', requireAuth, matchRequestController.updateMatchRequest);
router.get('/getMatchResult', requireAuth, matchRequestController.getMatchResult);
router.get('/removeMatchRequest', requireAuth, matchRequestController.removeMatchRequest);

router.post('/signin', requireSignin, UserController.signin);
router.post('/signup', UserController.signup);
router.route('/interests')
  .put(requireAuth, UserController.updateInterest);
router.route('/updatename')
  .put(requireAuth, UserController.updateName);
router.route('/rating')
  .put(requireAuth, UserController.updateRatings);
router.route('/userprofile')
  .get(requireAuth, UserController.getProfile);
router.route('/user/:someID')
  .get(UserController.getOtherProfile);
router.route('/matchhistory')
  .get(requireAuth, UserController.getMatchHistory);


export default router;
