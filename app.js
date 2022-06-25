//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

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

//user schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

//initialize passport-local-mongoose
userSchema.plugin(passportLocalMongoose);

//Model for the Schema
const User = mongoose.model("User", userSchema);

//creating and destroying cookies
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Routes
app.get("/", (req,res)=>{
    res.render("home");
});

app.get("/login", (req,res)=>{
    res.render("login");
});

app.get("/register", (req,res)=>{
    res.render("register");
});

app.get("/logout", (req,res)=>{
    req.logOut(()=>{
        res.redirect("/");
    });
});

app.get("/secrets", (req,res)=>{
    if(req.isAuthenticated())
        res.render("secrets");
    else
        res.redirect("/login");
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

app.listen(3000, ()=>{
    console.log("Server started at PORT 3000");
    console.log("http://localhost:3000");
});