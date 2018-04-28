const projectConfig = {
  development: {
    mongoURI: 'mongodb://localhost/munchBuddy',
    port: 9090,
  },
  production: {
    mongoURI: process.env.MONGODB_URI,
    port: process.env.PORT,
  },
  test: {
    mongoURI: 'mongodb://localhost/test',
    port: 9999,
  },
};

export default projectConfig;
