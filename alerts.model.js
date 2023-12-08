const mongoose = require("mongoose")

const schema = mongoose.Schema({
    city : String,
    time : Date,
    area: String
})

module.exports = mongoose.model("Alerts", schema)