//for injecting author data

const { authors } = require("./dummy-data/authors");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);

const Author = require("./models/author");

require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log("connecting to", MONGODB_URI);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    Author.insertMany(authors);
  })
  .catch((err) => {
    console.log("error connecting to mongoDB", err.message);
  });
