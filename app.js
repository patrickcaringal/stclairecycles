const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const logger = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const env = require('./utility_modules/environment')(process.env.NODE_ENV);

const app = express();
const mongoose = require('mongoose');

const indexRouter = require('./routes/index');

mongoose
    .connect(process.env.APP_DB, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => console.log(`DB Connected: ${process.env.APP_DB}`))
    .catch(err => console.log('DB Error', err));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(helmet());
app.use(compression());

// routes
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handlers
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
