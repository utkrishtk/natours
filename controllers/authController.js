const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/AppError');
const Email = require('./../utils/email');
const crypto = require('crypto');
//Helper function for signing token
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ), //Browser will delete the cookie on expiration
    httpOnly: true, //this will not let browser acess the cookie
    // secure: false, //This is to send only on secure chanel like https
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  //Name is like the unique identifier to the cookie
  user.password = undefined; //Revmove the password from the output

  res.cookie('jwt', token, cookieOptions).status(statusCode).json({
    status: 'success',
    token,
    user: user,
  });
};

//Handler to handle the signup
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordconfirm: req.body.passwordconfirm,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

//Handler to handle the login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1)Check if email and password exist
  if (!email || !password)
    return next(new AppError('Email or password is not given', 400));

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('Invalid email or password', 401));

  createSendToken(user, 200, res);
});

//To access the protected resources our request has to first go through this function
exports.protect = catchAsync(async (req, res, next) => {
  //Collect Token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token)
    return next(new AppError('Please login to access this resource', 401));

  //verification token
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //Check if user still exists
  const currentUser = await User.findById(decode.id);

  if (!currentUser)
    return next(
      new AppError('User belonging to this token no longer exist!', 401)
    );

  //Check if user changes password after token created
  if (currentUser.changePasswordAfter(decode.iat))
    return next(
      new AppError(
        'Password has been changed since last login. Login again!',
        401
      )
    );

  //Grant Access to protected Route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    const token = req.cookies.jwt;
    const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decode.id);
    if (!currentUser) return next();
    if (currentUser.changePasswordAfter(decode.iat)) return next();

    res.locals.user = currentUser;
    return next();
  }
  next();
});

exports.permitUser =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Permission denied, Please login as an admin', 403)
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on posTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError('Your user email is not registered with us'), 404);

  //2)Generate the random reset Token
  const resetToken = user.changePasswordResetToken();
  await user.save({ validateBeforeSave: false }); //This save is for saving some extra data which coming from changePasswordResetToken instance method wihtout validation

  //3)Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email`;

  try {
    await new Email(user, resetURL).sendResetPassword();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validationBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //Get user based on the token
  const encryptedTokenToFind = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: encryptedTokenToFind,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user)
    return next(new AppError('Invalid token or it has been expired', 403));
  //If token is not expired and there is user than set the password
  user.password = req.body.password;
  user.passwordconfirm = req.body.passwordconfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  //If everything Ok Send validation to client

  createSendToken(user, 200, res);
});
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password)))
    return next(new AppError('Invalid email or password', 401));
  user.password = req.body.password;
  user.passwordconfirm = req.body.passwordConfirm;
  await user.save();
  createSendToken(user, 200, res);
});
