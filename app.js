//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({extended: true}));

//initialize session
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

//initialize passport
app.use(passport.initialize());
app.use(passport.session());

//mongoose connection
mongoose.connect("mongodb://localhost:27017/userDB");
// mongoose.set("UseCreateIndex", true);

//user schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

//initialize passport-local-mongoose
userSchema.plugin(passportLocalMongoose);

userSchema.plugin(findOrCreate);

//Model for the Schema
const User = new mongoose.model("User", userSchema);

//creating and destroying cookies
passport.use(User.createStrategy());

passport.serializeUser((user,done)=>{
    done(null, user.id);
});
passport.deserializeUser((id, done)=>{
    User.findById(id,(err,user)=>{
        done(err,user);
    });
});

//initialize google strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Routes
app.get("/", (req,res)=>{
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate("google", {scope: ["profile"]})
);

app.get("/auth/google/secrets", 
    passport.authenticate("google", {failureRedirect: "/login"}),(req,res)=>{
        res.redirect("/secrets");
    }
);

app.get("/login", (req,res)=>{
    res.render("login");
});

app.get("/register", (req,res)=>{
    res.render("register");
});

app.get("/submit", (req,res)=>{
    if(req.isAuthenticated())
        res.render("submit");
    else
        res.redirect("/login");
})

app.get("/logout", (req,res)=>{
    req.logout((err)=>{
        if(!err)
            res.redirect("/");
    })
});

app.get("/secrets", (req,res)=>{
    User.find({"secret": {$ne: null}}, (err, foundUsers)=>{
        res.render("secrets", {usersWithSecrets: foundUsers});
    });
});

app.post("/register", (req,res)=>{
    User.register({username: req.body.username}, req.body.password, (err, user)=>{
        if(err){
            console.log(err);
            res.redirect("/register");
        } else{
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", (req,res)=>{
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, (err)=>{
        if(err)
            console.log(err);
        else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/submit", (req,res)=>{
    const submittedSecret = req.body.secret;
    User.findById(req.user.id, (err, foundUser)=>{
       if(!err){
        if(foundUser){
            foundUser.secret = submittedSecret;
            foundUser.save(()=>{
                res.redirect("/secrets");
            });
        }
       }
    });
});

app.listen(3000, ()=>{
    console.log("Server started at PORT 3000");
    console.log("http://localhost:3000");
});