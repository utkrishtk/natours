const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'You must give name to your user'],
  },
  email: {
    type: String,
    unique: true,
    required: [true, 'You must give email to your user'],
    lowercase: true,
    validate: [validator.isEmail, 'Please type the valid format for email'],
  },
  photo: {
    type: String,
    default: 'default.png',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Password field is important to be filled correctly.'],
    minlength: 8,
    select: false,
  },
  passwordconfirm: {
    type: String,
    required: [true, 'Password must match '],
    validate: {
      //This only work Create or save not on findByIdAndUpdate
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangeAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  //Only run if the password is modified
  if (!this.isModified('password')) return next();

  //Hashing the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  //Delete passwordConfirm field
  this.passwordconfirm = undefined;
});

//This is to acknowledge password change
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangeAt = Date.now() - 1000; //Sometimes it take time to save into database that's why we are subtracting 1 second
});

//this pre find hook is to check for either user is deleted or not
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

//Instance method for checking the password received during login
userSchema.methods.correctPassword = async function (
  receivedPassword,
  userPassword
) {
  return await bcrypt.compare(receivedPassword, userPassword);
};

userSchema.methods.changePasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangeAt) {
    const changeTimeStamp = parseInt(
      this.passwordChangeAt.getTime() / 1000,
      10
    );

    return changeTimeStamp > jwtTimestamp;
  }
  return false;
};

userSchema.methods.changePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
