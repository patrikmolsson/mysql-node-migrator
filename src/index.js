import fs from 'fs';
import mysql from 'promise-mysql';

/**
 * parse file name {version, name}
 *
 * @param fileName {string} - file name
 * @param fullPathToFile {string} - absolute file path
 */
function parseFile(fileName, fullPathToFile) {
  const matches = /V(\d+)__([\w_]+)\.sql/g.exec(fileName);
  if (!matches || matches.index < 0) {
    throw new Error(`file ['${fileName}'] has an invalid file name template`);
  }

  return {
    version: parseInt(matches[1], 10),
    name: matches[2].replace(/_/g, ' '),
    absolute_path: fullPathToFile,
  };
}

let log;

function info(message) {
  log(message, 'info');
}

function error(message) {
  log(message, 'error');
}

/**
 * create empty migration schema table
 *
 * @param connection {Connection}
 */
function init(connection) {
  const query = `CREATE TABLE IF NOT EXISTS \`migration_schema\` (
                    \`version\` INT PRIMARY KEY,
                    \`name\` TEXT NOT NULL,
                    \`date\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE = InnoDB`;

  return connection.query(query);
}


/**
 * @param migrationsFolder {string} - path to migrations folder
 */
function readMigrations(migrationsFolder) {
  return new Promise((resolve, reject) => {
    fs.readdir(`${process.cwd()}/${migrationsFolder}`, (err, files) => {
      const migrations = [];
      if (err) {
        reject(err);
      }

      if (!files) {
        info('no migrations found');

        resolve(migrations);
        return;
      }

      info(`found [${files.length}] migrations`);

      for (let i = 0; i < files.length; i += 1) {
        try {
          const result = parseFile(files[i], `${migrationsFolder}/${files[i]}`);

          migrations.push(result);
        } catch (e) {
          error(e.message);
        }
      }

      resolve(migrations);
    });
  });
}


function insertMigrationInformation(connection, migrationScript) {
  const toInsert = {
    version: migrationScript.version,
    name: migrationScript.name,
  };

  return connection.query('INSERT INTO migration_schema SET ?', toInsert);
}

async function applyMigration(connection, migrationScript) {
  const content = fs.readFileSync(migrationScript.absolute_path, 'utf8');

  try {
    await connection.beginTransaction();

    await connection.query(content);

    await insertMigrationInformation(connection, migrationScript);

    await connection.commit();

    info(`migration [${migrationScript.version}][${migrationScript.name}] successfully applied`);
  } catch (err) {
    error(`cannot execute query. Reason [${err.message}]`);

    connection.rollback();
  }
}

/**
 * @param connection {Connection} -  to work with database
 */
function getExistingMigrations(connection) {
  return connection.query('SELECT * FROM migration_schema');
}

/**
 * this function executes new migrations
 * if new exists
 *
 * @param connection {Connection} -  to work with database
 * @param migrations {object[]} - all existed migrations data
 */
async function processMigrations(connection, migrations) {
  migrations.sort((a, b) => a.version - b.version);

  const existingMigrations = await getExistingMigrations(connection);

  const migrationsToExecute = migrations
    .filter(mScript => !existingMigrations.some(m => m.version === mScript.version));

  info(`wanting to execute [${migrationsToExecute.length}] migrations`);

  // Make our forEach async functions synchronous
  await migrationsToExecute.reduce((promiseChain, migrationScript) =>
    promiseChain.then(() => applyMigration(connection, migrationScript)), Promise.resolve());

  info('all migrations successfully applied to database');
}


/**
 * parse file name {version, name}
 *
 * @param connectionOptions
 * @param folder
 * @param logger
 * @param logging
 */
export default async function (connectionOptions, { folder, logger = console, logging = true }) {
  log = (message, level) => {
    if (logging) {
      logger[level](`[DBMIGRATE] ${message}`);
    }
  };

  info('initiating migration');

  let connection;
  try {
    connection = await mysql.createConnection(connectionOptions);
    info('connected to db');
  } catch (err) {
    error(`could not connect to db: ${err.message}`);
    return;
  }



  try {
    await init(connection);
  } catch (err) {
    error(`could not create sql migrations table: ${err.message}`);
    return;
  }

  let migrations;
  try {
    migrations = await readMigrations(folder);
  } catch (err) {
    error(`could not read migrations: ${err.message}`);
    return;
  }

  try {
    await processMigrations(connection, migrations);
  } catch (err) {
    error(`could not process migrations: ${err.message}`);
    return;
  }

  await connection.end();
  info('finished migration');
}
