const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const should = chai.should();

chai.use(chaiHttp);

describe('Auth', () => {
  // Test the /POST route for user registration
  describe('/POST register', () => {
    it('it should not register a user without a name', (done) => {
      let user = {
        email: "test@test.com",
        password: "password"
      }
      chai.request(server)
        .post('/api/auth/register')
        .send(user)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('errors');
          res.body.errors[0].should.have.property('msg').eql('Name is required');
          done();
        });
    });
    it('it should register a user', (done) => {
      let user = {
        name: "Test User",
        email: "test@test.com",
        password: "password"
      }
      chai.request(server)
        .post('/api/auth/register')
        .send(user)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('token');
          done();
        });
    });
  });

  // Test the /POST route for user login
  describe('/POST login', () => {
    it('it should not login a user with a wrong password', (done) => {
      let user = {
        email: "test@test.com",
        password: "wrongpassword"
      }
      chai.request(server)
        .post('/api/auth/login')
        .send(user)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('message').eql('Invalid Credentials');
          done();
        });
    });
    it('it should login a user', (done) => {
      let user = {
        email: "test@test.com",
        password: "password"
      }
      chai.request(server)
        .post('/api/auth/login')
        .send(user)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('token');
          done();
        });
    });
  });
});
