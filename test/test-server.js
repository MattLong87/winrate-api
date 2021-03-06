const chai = require('chai');
const chaiHttp = require('chai-http');
const { TEST_DATABASE_URL } = require('../config');
const { app, runServer, closeServer } = require('../server');
const mongoose = require('mongoose');
const faker = require('faker');
const { User } = require('../models/models');

const should = chai.should();
chai.use(chaiHttp);
chai.use(require('chai-shallow-deep-equal'));

//declare fakeUsers array to access in tests
let fakeUsers = [];

function seedUsers(numUsers) {
  fakeUsers = [];
  for (let i = 0; i < numUsers; i++) {
    let user = [faker.internet.email().toLowerCase(), faker.internet.password()]
    fakeUsers.push(user);
    return User.hashPassword(user[1])
      .then(function (hash) {
        return User.create(generateFakeUser(user[0], hash))
          .catch((err) => console.log(err))
        //.then((user) => console.log(user))
      })
  }
}

function generateFakeUser(email, hash) {
  //5 random first names to use as players
  let players = [faker.name.firstName(), faker.name.firstName(), faker.name.firstName(), faker.name.firstName(), faker.name.firstName()];
  //5 random game names
  let games = [faker.commerce.productName(), faker.commerce.productName(), faker.commerce.productName(), faker.commerce.productName(), faker.commerce.productName()]
  let sessions = generateFakeSessions(Math.floor(Math.random() * 10), players, games);
  return {
    password: hash,
    email: email,
    created: Date.now(),
    name: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    sessions: sessions
  }
}

function generateFakeSessions(numSessions, players, games) {
  let sessions = [];
  for (let i = 0; i < numSessions; i++) {
    let session = {
      game: games[Math.floor(Math.random() * (games.length - 1))],
      players: players,
      winner: players[Math.floor(Math.random() * (players.length - 1))],
      date: Date.now()
    };
    sessions.push(session);
  }
  return sessions;
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

  describe('User login endpoint', function () {
    it('should log in a user on a POST request', function () {
      let userLogin = {
        email: fakeUsers[0][0],
        password: fakeUsers[0][1]
      }
      return chai.request(app)
        .post('/api/login')
        .send(userLogin)
        .then(function (res) {
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.email.should.equal(fakeUsers[0][0]);
        })
    })

    it('should refuse login with incorrect credentials', function () {
      let userLogin = {
        email: fakeUsers[0][0],
        password: "wrongpassword"
      }
      return chai.request(app)
        .post('/api/login')
        .send(userLogin)
        .catch(function (res) {
          res.should.have.status(401);
        })
    })
  })

  describe('Create user endpoint', function () {
    it('should create new user on a POST request', function () {
      let newUser = {
        email: "new@user.com",
        password: "abc123",
        firstName: "Matthew",
        lastName: "Long"
      }
      return chai.request(app)
        .post('/api/users')
        .send(newUser)
        .then(function (res) {
          User.findOne({ email: newUser.email })
            .then(user => {
              user.name.firstName.should.equal(newUser.firstName);
              user.name.lastName.should.equal(newUser.lastName);
              user.password.should.not.equal(newUser.password);
            })
        })
    })
    it('should refuse creation if email already exists', function () {
      let newUser = {
        email: fakeUsers[0][0],
        password: "abc123",
        firstName: "Matthew",
        lastName: "Long"
      }
      return chai.request(app)
        .post('/api/users')
        .send(newUser)
        .catch(function (res) {
          res.should.have.status(422);
        })
    })
  })

  describe('/users/me endpoint', function () {
    it('should return user information on a GET request', function () {
      let userLogin = {
        email: fakeUsers[0][0],
        password: fakeUsers[0][1]
      }
      return chai.request(app)
        .post('/api/login')
        .send(userLogin)
        .then(function (res) {
          const token = res.body.token;
          return chai.request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${token}`)
            .then(function (_res) {
              let res = _res;
              res.should.have.status(200);
              res.should.be.json;
              res.body.email.should.equal(userLogin.email);
            })
        })
    })
  })

  describe('/users/me/add-session endpoint', function () {
    it('should add a session to user on a POST request', function () {
      let userLogin = {
        email: fakeUsers[0][0],
        password: fakeUsers[0][1]
      }
      let newSession = {
        game: "Test Game",
        players: ["a", "b", "c"],
        winner: "a",
        date: "today"
      }
      return chai.request(app)
        .post('/api/login')
        .send(userLogin)
        .then(function (res) {
          const token = res.body.token;
          return chai.request(app)
            .post('/api/users/me/add-session')
            .set('Authorization', `Bearer ${token}`)
            .send(newSession)
            .then(function (_res) {
              let res = _res;
              res.should.have.status(201);
              res.body.sessions[0].should.shallowDeepEqual(newSession);
            })
        })
    })
  })

  describe('/users/me/sessions endpoint', function () {
    it('should delete a session on a DELETE request', function () {
      let userLogin = {
        email: fakeUsers[0][0],
        password: fakeUsers[0][1]
      }
      return chai.request(app)
        .post('/api/login')
        .send(userLogin)
        .then(function(res) {
          const token = res.body.token;
          const sessionId = res.body.sessions[0]._id;
          return chai.request(app)
            .delete('/api/users/me/sessions')
            .set('Authorization', `Bearer ${token}`)
            .send({sessionId: sessionId})
            .then(function(_res){
              //delete route returns user object
              let res = _res;
              res.body.sessions[0]._id.should.not.equal(sessionId);
            })
        })
    })
  })
});