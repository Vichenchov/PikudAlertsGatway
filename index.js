const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const alertsModule = require("./alerts.model");
var pikudHaoref = require("pikud-haoref-api");
const moment = require("moment-timezone");
const https = require("https");
const fs = require("fs");
require("dotenv").config();
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const options = {
  key: fs.readFileSync("./server.key"),
  cert: fs.readFileSync("./server.cert"),
};

var interval = 5000;
const PORT = process.env.PORT || 3000;
const url = process.env.CONNECTION_STRING_MONGODB_ATLAS;
const clientServer = process.env.CLIENT_SERVER;

let isErrorInAPI = false;
let tempAlerts = [];
let prevAlerts = [];

const app = express();
const server = https.createServer(options, app);
app.use(
  cors({
    origin: clientServer,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes - the time frame for which requests are checked
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

app.use(limiter);

app.get("/", function (req, res) {
  res.status(200).send("Fuck Hamas!");
});

app.get("/isErrorInAPI", (req, res) => {
  res.send(isErrorInAPI);
});

mongoose
  .connect(url, {
    dbName: "PikudHaoref",
  })
  .then(() => {
    app.use(bodyParser.json());
    app.use(
      bodyParser.urlencoded({
        extended: true,
      })
    );

    server.listen(PORT, async () => {
      console.log(`Server has started on port: ${PORT}`);
      poll();
      cleanAndUpdate();
    });
  })
  .catch((err) => {
    console.error(`Error connecting to the database. ${err}`);
  });

// remove duplicate cities from the temp array (in case the alarm was more than 10 seconds it will delete unnecessary data)
function deleteDuplicate(data) {
  return data.filter((value, index) => data.indexOf(value) === index);
}

function removePrevAlertsFromCurrent(currentArray) {
  return currentArray.filter((city) => !prevAlerts.includes(city));
}

// save the data every 1 minute
const cleanAndUpdate = () => {
  setTimeout(cleanAndUpdate, 90 * 1000);

  const currentNoDuplicates = deleteDuplicate(tempAlerts);
  const currentFinal = removePrevAlertsFromCurrent(currentNoDuplicates);

  prevAlerts = currentFinal;

  currentFinal.forEach(async (city) => {
    const now = moment().tz("Asia/Jerusalem");
    //fixes the problem with the time saved in the db - probably because of time zones on mongo Atlas
    const later = now.clone().add(2, "hours");
    //add the offset because I'm saving the alerts 90 seconds later
    const earlier = later.clone().subtract(90, "seconds");

    const time = earlier.toDate();

    var data = new alertsModule({
      city: city,
      time: time,
    });

    console.log(data);

    await data
      .save()
      .then((res) => {})
      .catch((err) => {
        console.log(`Saving data in DB failed at: ${new Date()} `, err);
      });
  });

  tempAlerts = [];
};

// Define polling function
var poll = function () {
  pikudHaoref.getActiveAlert(async function (err, alert) {
    // Schedule polling in X millis
    setTimeout(poll, interval);

    // Log errors
    if (err) {
      isErrorInAPI = true;
      return console.log(
        `Retrieving active alert failed at: ${new Date()} `,
        err
      );
    }
    isErrorInAPI = false;

    console.log(alert);

    if (alert.type == "missiles") {
      alert.cities.forEach((city) => {
        tempAlerts.push(city);
      });
    }
  });
};
