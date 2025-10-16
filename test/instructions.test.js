const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const should = chai.should();

chai.use(chaiHttp);

describe('Instructions', () => {
  let token;

  before((done) => {
    let user = {
      name: "Instructions Test User",
      email: "instructionstest@test.com",
      password: "password"
    }
    chai.request(server)
      .post('/api/auth/register')
      .send(user)
      .end((err, res) => {
        chai.request(server)
          .post('/api/auth/login')
          .send({ email: "instructionstest@test.com", password: "password" })
          .end((err, res) => {
            token = res.body.token;
            done();
          });
      });
  });

  // Test the /POST route for saving instructions
  describe('/POST instructions', () => {
    it('it should not save instructions without content', (done) => {
      let instruction = {
        content: ""
      }
      chai.request(server)
        .post('/api/instructions')
        .set('Authorization', `Bearer ${token}`)
        .send(instruction)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('errors');
          res.body.errors[0].should.have.property('msg').eql('Content is required');
          done();
        });
    });
    it('it should save instructions', (done) => {
      let instruction = {
        content: "These are my instructions."
      }
      chai.request(server)
        .post('/api/instructions')
        .set('Authorization', `Bearer ${token}`)
        .send(instruction)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('content').eql('These are my instructions.');
          done();
        });
    });
  });

  // Test the /GET route for getting instructions
  describe('/GET instructions', () => {
    it('it should get the instructions', (done) => {
      chai.request(server)
        .get('/api/instructions')
        .set('Authorization', `Bearer ${token}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('content').eql('These are my instructions.');
          done();
        });
    });
  });

  // Test the /GET route for getting the last update time
  describe('/GET instructions/last-update', () => {
    it('it should get the last update time', (done) => {
      chai.request(server)
        .get('/api/instructions/last-update')
        .set('Authorization', `Bearer ${token}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('updatedAt');
          done();
        });
    });
  });
});
