const env = require('dotenv').config();

function setEnvironmentVariables(environment) {
    switch (environment) {
        case 'production':
            process.env.APP_DB = process.env.PRODUCTION_DB;
            process.env.APP_HOST = process.env.PRODUCTION_HOST;
            break;

        case 'development':
            process.env.APP_DB = process.env.DEVELOPMENT_DB;
            process.env.APP_HOST = process.env.DEVELOPMENT_HOST;
            break;

        default:
            process.env.APP_DB = process.env.DEVELOPMENT_DB;
            process.env.APP_DB = process.env.DEVELOPMENT_HOST;
            break;
    }
}

module.exports = setEnvironmentVariables;
