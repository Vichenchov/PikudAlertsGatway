const mongoose = require("mongoose")

const schema = mongoose.Schema({
    city : String,
    time : Date,
})

module.exports = mongoose.model("Alerts", schema)