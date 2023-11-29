const express = require("express")
const mongoose = require("mongoose")
const bodyParser = require('body-parser');
const alertsModule = require('./alerts.model')
var pikudHaoref = require('pikud-haoref-api');
require('dotenv').config();
const cors = require('cors')

var interval = 5000;
const PORT = process.env.PORT || 3002;
const url = process.env.CONNECTION_STRING_MONGODB_ATLAS;
let isErrorInAPI = false;
let tempAlerts = [];
let prevAlerts = [];

const app = express()
app.use(cors({
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST'], 
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

app.get('/isErrorInAPI', (req, res) => {
    res.send(isErrorInAPI);
})

mongoose
    .connect(url, {
        dbName: 'PikudHaoref',
    })
    .then(() => {
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({
            extended: true
        }));

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

function removePrevAlertsFromCurrent(currentArray) {
    return currentArray.filter(city => !prevAlerts.includes(city));
}

// save the data every 1 minute
const cleanAndUpdate = () => {
    setTimeout(cleanAndUpdate, 90 * 1000);

    const currentNoDuplicates = deleteDuplicate(tempAlerts);
    const currentFinal = removePrevAlertsFromCurrent(currentNoDuplicates);
    
    prevAlerts = currentFinal;

    let now = new Date();
    currentFinal.forEach(async city => {
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
