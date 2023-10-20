const express = require("express")
const mongoose = require("mongoose")
const bodyParser = require('body-parser');
const alertsModule = require('./alerts.model')
var pikudHaoref = require('pikud-haoref-api');
require('dotenv').config();

var interval = 10000;
const PORT = process.env.PORT || 3000;
const url = process.env.CONNECTION_STRING_MONGODB_ATLAS;
let isErrorInAPI = false;
let tempAlerts = [];

// const router = express.Router();
const app = express()

mongoose
    .connect(url, {
        dbName: 'PikudHaoref',
    })
    .then(() => {
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({
            extended: true
        }));
        // router.get('/isErrorInAPI', (req, res) => {
        //     res.send(isErrorInAPI);
        // })
        // app.use("/", router)

        app.get('/isErrorInAPI', (req, res) => {
            res.send(isErrorInAPI);
        })

        app.listen(PORT, async () => {
            console.log(`Server has started on port: ${PORT}`)
            poll();
            cleanAndUpdate();
        })
    }).catch((err) => {
        console.error(`Error connecting to the database. ${err}`);
    })

// remove duplicate cities from the temp array (in case the alarm was more than 10 seconds it will delete unnecessary data)
function deleteDuplicate(data) {
    return data.filter((value, index) => data.indexOf(value) === index);
}

// save the data every 1 minute
const cleanAndUpdate = () => {
    setTimeout(cleanAndUpdate, 60000);
    const cleanArray = deleteDuplicate(tempAlerts);
    let now = new Date();
    cleanArray.forEach(async city => {
        var data = new alertsModule({
            city : city,
            time : now
        });

        await data.save().then((res) => {
        }).catch(err => {
            console.log(`Saving data in DB failed at: ${new Date()} `, err);
        });
    });

    tempAlerts = [];
}

// Define polling function
var poll = function () {
    pikudHaoref.getActiveAlert(async function (err, alert) {
        // Schedule polling in X millis
        setTimeout(poll, interval);

        // Log errors
        if (err) {
            isErrorInAPI = true
            return console.log(`Retrieving active alert failed at: ${new Date()} `, err);
        }
        isErrorInAPI = false

        console.log(alert);

        if (alert.type == 'missiles') {
            alert.cities.forEach(city => {
                tempAlerts.push(city);
            });
        }
    });
}
