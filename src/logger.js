const createLogger = (loggingFunction, shouldLog) => ({
  log(message, level) {
    if (shouldLog) {
      loggingFunction[level](`[DBMIGRATE] ${message}`);
    }
  },

  info(message) {
    this.log(message, 'info');
  },

  error(message) {
    this.log(message, 'error');
  },
});

export default createLogger;
