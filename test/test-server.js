const chai = require('chai');
const chaiHttp = require('chai-http');
const { TEST_DATABASE_URL } = require('../config');
const { app, runServer, closeServer } = require('../server');
const mongoose = require('mongoose');
const faker = require('faker');

const should = chai.should();
chai.use(chaiHttp);

//declare fakeUsers array to access in tests
let fakeUsers = [];

function seedUsers(numUsers) {
    for (let i = 0; i++; i < numUsers) {
      //let user = [faker.internet.email(), faker.internet.password()]
      let user = "Matt";
      fakeUsers.push(user);
    }
    console.log(fakeUsers);
}

function tearDownDb() {
  return mongoose.connection.dropDatabase();
}

describe('Winrate API', function () {

  before(function () {
    return runServer(TEST_DATABASE_URL);
  });
  beforeEach(function () {
    return seedUsers(10);
  })
  afterEach(function () {
    return tearDownDb();
  })
  after(function () {
    return closeServer();
  });

  it('should 200 on GET requests', function () {
    return chai.request(app)
      .get('/api/')
      .then(function (res) {
        res.should.have.status(200);
        res.should.be.json;
      });
  });


});