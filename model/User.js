const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({

    name: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    confirm_password: {
        type: String,
        required: true
    },
    emailToken: {
        type: String,
    }

})

const User = mongoose.model('user', UserSchema);
User.createIndexes();
module.exports = User