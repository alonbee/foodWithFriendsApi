import chai from 'chai';
import chaiHttp from 'chai-http';
import Request from '../app/models/request_model';
import server from '../app/server';  // make sure that you export the server

const should = chai.should();  // eslint-disable-line no-unused-vars
const ROOT_URL = '/api';
chai.use(chaiHttp);

const currentTime = new Date();
// const adjustedCurrentTime = new Date(currentTime.getTime() + (4 * 60 * 60 * 1000));  // Adjuest EST timezone to UST
const adjustedCurrentTime = new Date(currentTime.getTime());  // Adjuest EST timezone to UST
const startTime1 = new Date(adjustedCurrentTime.getTime() - (2 * 60 * 1000));
const startTime2 = new Date(adjustedCurrentTime.getTime() + (8 * 60 * 1000));
const startTime3 = new Date(adjustedCurrentTime.getTime() + (4 * 60 * 1000));

const startTime4 = new Date(adjustedCurrentTime.getTime() + (2 * 60 * 1000));

describe('MatchingRequests', () => {
  before((done) => {  // Before each test we empty the database
    Request.remove({}, (err) => {
      done();
    });
  });

  describe('/POST matchRequest', () => {  // This tests our POST signUp route
    it('Insert the first request into db. start_time= 00:45, end_time= 00:50; Should have no match', (done) => {  // A description of what should happen
      chai.request(server)
        .post(`${ROOT_URL}/matchRequest`)  // Make the API request
        .send({ topic: 'test topic', loc: [10.5, 93.6], start_time: '2017-05-23T00:45:29.878Z', end_time: '2017-05-23T00:50:29.878Z', User: '591e1589bdffb41da9629b50' })  // test case
        .end((err, res) => {  // Process the response
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('Object');
          res.body.should.have.property('Message');
          res.body.Message.should.be.a('string');
          done();
        });
    });
  });

  describe('/POST matchRequest', () => {  // This tests our POST signUp route
    it('Insert the second request into db. start_time= 00:51, end_time= 00:56; Should have no match', (done) => {  // A description of what should happen
      chai.request(server)
        .post(`${ROOT_URL}/matchRequest`)  // Make the API request
        .send({ topic: 'test topic', loc: [10.5, 93.6], start_time: '2017-05-23T00:51:29.878Z', end_time: '2017-05-23T00:56:29.878Z', User: '591e1589bdffb41da9629b51' })  // test case
        .end((err, res) => {  // Process the response
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('Object');
          res.body.should.have.property('Message');
          res.body.Message.should.be.a('string');
          done();
        });
    });
  });

  describe('/POST matchRequest', () => {  // This tests our POST signUp route
    it('Insert the third request into db. start_time= 00:47, end_time= 00:52; Should have two matches. Only return one with earliest start time.', (done) => {  // A description of what should happen
      chai.request(server)
        .post(`${ROOT_URL}/matchRequest`)  // Make the API request
        .send({ topic: 'test topic', loc: [10.5, 93.6], start_time: '2017-05-23T00:47:29.878Z', end_time: '2017-05-23T00:52:29.878Z', User: '591e1589bdffb41da9629b52' })  // test case
        .end((err, res) => {  // Process the response
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('Object');
          res.body.should.have.property('RequestID');
          res.body.RequestID.should.be.a('string');
          res.body.should.have.property('InstaMatchedWith');
          res.body.InstaMatchedWith.should.be.a('Object');
          res.body.InstaMatchedWith.should.have.property('User');
          res.body.InstaMatchedWith.User.should.be.a('string');
          done();
        });
    });
  });
});
