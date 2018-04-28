import chai from 'chai';
import chaiHttp from 'chai-http';
import User from '../app/models/user_model';
import server from '../app/server';  // make sure that you export the server

const should = chai.should();  // eslint-disable-line no-unused-vars
const ROOT_URL = '/api';
chai.use(chaiHttp);

describe('User', () => {
  before((done) => {  // Before each test we empty the database
    User.remove({}, (err) => {
      done();
    });
  });

  describe('/POST signup', () => {  // This tests our GET signUp route
    it('it should return the token of the user', (done) => {  // A description of what should happen
      chai.request(server)
        .post(`${ROOT_URL}/signup`)  // Make the API request
        .send({ email: 'testAccount@test.com', password: 'password' })  // test case
        .end((err, res) => {  // Process the response
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('Object');
          res.body.should.have.property('token');
          res.body.token.should.be.a('string');
          done();
        });
    });
  });

  // describe('/POST signIn', () => {  // This tests our GET signUp route
  //   it('Using the signedUp account. It should return the token of the user', (done) => {  // A description of what should happen
  //     chai.request(server)
  //       .post(`${ROOT_URL}/signin`)  // Make the API request
  //       .send({ email: 'testAccount@test.com', password: 'password' })  // test case
  //       .end((err, res) => {  // Process the response
  //         res.should.have.status(200);
  //         res.should.be.json;
  //         res.body.should.be.a('Object');
  //         res.body.should.have.property('token');
  //         res.body.token.should.be.a('string');
  //         done();
  //       });
  //   });
  // });
});
