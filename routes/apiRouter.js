const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models/models');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const BearerStrategy = require('passport-http-bearer').Strategy;

passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    let user;
    User.findOne({ email: email.toLowerCase() })
        .exec()
        .then(_user => {
            user = _user;
            if (!user) {
                return done(null, false, { message: 'Email not found' });
            }
            return user.validatePassword(password);
        })
        .then(isValid => {
            if (!isValid) {
                return done(null, false, { message: 'Incorrect password' });
            }
            else {
                user.token = User.generateToken();
                user.save((err, updatedUser) => {
                    return done(null, updatedUser);
                })
            }
        })
}));

passport.use(new BearerStrategy(
    function (token, done) {
        User.findOne({ token: token }, function (err, user) {
            if (err) { return done(err); }
            if (!user) { return done(null, false); }
            return done(null, user, { scope: 'all' });
        });
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user.apiRepr());
    })
})

//MIDDLEWARE
router.use(passport.initialize());

router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

router.get('/', (req, res) => {
    res.json({message: "WinRate API"});
});

router.post('/login', passport.authenticate('local'), (req, res) => {
    User.findById(req.user.id)
    .exec()
    .then(user => {
        res.send(user.apiRepr());
    })
});

//GET a user's information
router.get('/users/me', passport.authenticate('bearer', { session: false }), (req, res) => {
    //user is attached to request object by passport.deserializeUser
    User.findById(req.user.id)
    .exec()
    .then(user => {
        res.send(user.apiRepr());
    })
})

//POST to create a new user
router.post('/users', (req, res) => {
    //verify required fields are present
    const requiredFields = ["password", "email", "firstName", "lastName"];
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!req.body[field]) {
            return res.json({ message: `Missing field: ${field}` });
        }
    }
    User.find({ email: req.body.email })
        .count()
        .exec()
        .then(count => {
            if (count > 0) {
                return res.status(422).json({ message: 'Email already registered' });
            }
            return User.hashPassword(req.body.password)
        })
        .then(hash => {
            return User.create({
                email: req.body.email.toLowerCase(),
                password: hash,
                created: Date.now(),
                name: {
                    firstName: req.body.firstName,
                    lastName: req.body.lastName
                }
            })
        })
        .then(
        user => res.status(201).json(user.apiRepr())
        )
        .catch(err => {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        })
})

//POST to add a session
router.post('/users/me/add-session', passport.authenticate('bearer', { session: false }), (req, res) => {
    //verify required fields are present
    const requiredFields = ["game", "players", "winner", "date"];
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!req.body[field]) {
            return res.json({ message: `Missing field: ${field}` });
        }
    }
    let newSession = {
        game: req.body.game,
        players: req.body.players,
        winner: req.body.winner,
        date: req.body.date
    };
    User.findOneAndUpdate({ username: req.user.username }, { $push: { sessions: { $each: [newSession], $position: 0 } } }, { new: true })
        .exec()
        .then((user) => {
            res.status(201).json(user.apiRepr());
        })
})

//DELETE a specific session by ID
router.delete('/users/me/sessions', passport.authenticate('bearer', { session: false }), (req, res) => {
    //verify required fields are present
    const requiredFields = ["sessionId"];
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!req.body[field]) {
            return res.json({ message: `Missing field: ${field}` });
        }
    }
    User.findOneAndUpdate({ username: req.user.username }, { $pull: { sessions: { _id: req.body.sessionId } } }, {new: true})
        .exec()
        .then((user) => res.json(user.apiRepr()))
})

module.exports = router;