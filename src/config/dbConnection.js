const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
async function connect() {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log("Success");
  } catch (error) {
    console.log("Failure");
    console.log(error);
  }
}

module.exports = { connect };
