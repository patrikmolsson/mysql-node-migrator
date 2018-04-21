import mysql from 'promise-mysql';
import logger from './logger';
import FileHelper from './fileHelper';
import DatabaseHelper from './databaseHelper';

let Logger;

async function applyMigration(connection, migrationScript) {
  const queries = FileHelper.readAndParseScript(migrationScript);

  try {
    await connection.beginTransaction();

    // We want to handle the queries sequentially, and avoid a deep
    // promise chain, therefore we use the for-loop
    for (let i = 0; i < queries.length; i += 1) {
      const query = queries[i];

      Logger.info(`trying to execute query: ${query}`);

      // eslint-disable-next-line no-await-in-loop
      await connection.query(query);
    }

    await DatabaseHelper.insertMigrationInformation(connection, migrationScript);

    await connection.commit();

    Logger.info(`migration [${migrationScript.version}][${migrationScript.name}] successfully applied`);
  } catch (err) {
    Logger.error(`cannot execute query. Reason [${err.message}]`);

    await connection.rollback();

    throw err;
  }
}

/**
 * Sorts the migrations from file system and filters already executed ones.
 *
 * @param connection {Connection}
 * @param migrationsFromFileSystem {string[]}
 * @return {Promise<object[]>}
 */
async function getMigrationsToExecute(connection, migrationsFromFileSystem) {
  const existingMigrations = await DatabaseHelper.getExistingMigrations(connection);

  return migrationsFromFileSystem
    .sort((a, b) => a.version - b.version)
    .filter(mScript => !existingMigrations.some(m => m.version === mScript.version));
}

/**
 *
 * @param connection {Connection} -  to work with database
 * @param migrationsToExecute {object[]} - all existed migrations data
 */
function executeMigrations(connection, migrationsToExecute) {
  // Make our forEach async functions synchronous
  return migrationsToExecute.reduce((promiseChain, migrationScript) =>
    promiseChain.then(() => applyMigration(connection, migrationScript)), Promise.resolve());
}


// noinspection JSUnusedGlobalSymbols
/**
 * parse file name {version, name}
 *
 * @param connectionOptions
 * @param {Object} options Other options
 * @param {string} options.folder
 * @param {function} [options.loggingFunction=console] The logging function to use
 * @param {boolean} [options.shouldLog=true] If the script shall write logging information
 * @return {Promise} Whether or not the migration was successful
 */
export default async function (connectionOptions, options) {
  const { folder, loggingFunction = console, shouldLog = true } = options;

  Logger = logger(loggingFunction, shouldLog);

  let connection;
  try {
    Logger.info('initiating migration');
    try {
      connection = await mysql.createConnection(connectionOptions);
      Logger.info('connected to db');
    } catch (err) {
      Logger.error(`could not connect to db: ${err.message}`);
      throw err;
    }


    try {
      await DatabaseHelper.insertTable(connection);
    } catch (err) {
      Logger.error(`could not create sql migrations table: ${err.message}`);
      throw err;
    }

    let migrations;
    try {
      migrations = await FileHelper.readMigrations(folder, Logger);
    } catch (err) {
      Logger.error(`could not read migrations: ${err.message}`);
      throw err;
    }

    let migrationsToExecute;
    try {
      migrationsToExecute = await getMigrationsToExecute(connection, migrations);
      Logger.info(`wanting to execute [${migrationsToExecute.length}] migrations`);
    } catch (err) {
      Logger.error(`could not filter migrations to execute: ${err.message}`);
      throw err;
    }

    try {
      await executeMigrations(connection, migrationsToExecute);
      Logger.info('all migrations successfully applied to database');
    } catch (err) {
      Logger.error(`could not process migrations: ${err.message}`);
      throw err;
    }

    Logger.info('finished migration');
  } finally {
    if (connection) {
      connection.end();
    }
  }
}
