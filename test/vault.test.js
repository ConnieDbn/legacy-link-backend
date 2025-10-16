const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const should = chai.should();

chai.use(chaiHttp);

describe('Vault', () => {
  let token;

  before((done) => {
    let user = {
      name: "Vault Test User",
      email: "vaulttest@test.com",
      password: "password"
    }
    chai.request(server)
      .post('/api/auth/register')
      .send(user)
      .end((err, res) => {
        chai.request(server)
          .post('/api/auth/login')
          .send({ email: "vaulttest@test.com", password: "password" })
          .end((err, res) => {
            token = res.body.token;
            done();
          });
      });
  });

  // Test the /POST route for creating a vault item
  describe('/POST vault', () => {
    it('it should not create a vault item without a title', (done) => {
      let vaultItem = {
        type: "document"
      }
      chai.request(server)
        .post('/api/vault')
        .set('Authorization', `Bearer ${token}`)
        .send(vaultItem)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('errors');
          res.body.errors[0].should.have.property('msg').eql('Title is required');
          done();
        });
    });
    it('it should create a vault item', (done) => {
      let vaultItem = {
        title: "Test Vault Item",
        type: "document"
      }
      chai.request(server)
        .post('/api/vault')
        .set('Authorization', `Bearer ${token}`)
        .send(vaultItem)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('title').eql('Test Vault Item');
          done();
        });
    });
  });

  // Test the /GET route for getting all vault items
  describe('/GET vault', () => {
    it('it should get all the vault items', (done) => {
      chai.request(server)
        .get('/api/vault')
        .set('Authorization', `Bearer ${token}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('array');
          res.body.length.should.be.eql(1);
          done();
        });
    });
  });
});
