const config = require('../../../../configuration').default();

module.exports = {
  uri: config.mongodb.uri,
  migrationsDir: __dirname,
  collectionName: 'migrations',
  autosync: false,
};
