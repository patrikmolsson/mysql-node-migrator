import fs from 'fs';

/**
 * parse file name {version, name}
 *
 * @param fileName {string} - file name
 * @param fullPathToFile {string} - absolute file path
 */
const parseFile = (fileName, fullPathToFile) => {
  const matches = /V(\d+)__([\w_]+)\.sql/g.exec(fileName);
  if (!matches || matches.index < 0) {
    throw new Error(`file ['${fileName}'] has an invalid file name template`);
  }

  return {
    version: parseInt(matches[1], 10),
    name: matches[2].replace(/_/g, ' '),
    absolute_path: fullPathToFile,
  };
};

export default {
  /**
   * @param migrationsFolder {string} - path to migrations folder
   * @return Promise<string[]>
   */
  readMigrations: (migrationsFolder, logger) => new Promise((resolve, reject) => {
    fs.readdir(`${process.cwd()}/${migrationsFolder}`, (err, files) => {
      const migrations = [];
      if (err) {
        reject(err);
      }

      if (!files) {
        logger.info('no migrations found');

        resolve(migrations);
        return;
      }

      logger.info(`found [${files.length}] migrations`);

      for (let i = 0; i < files.length; i += 1) {
        try {
          const result = parseFile(files[i], `${migrationsFolder}/${files[i]}`);

          migrations.push(result);
        } catch (e) {
          logger.error(e.message);
        }
      }

      resolve(migrations);
    });
  }),

  readAndParseScript: migrationScript => fs.readFileSync(migrationScript.absolute_path, 'utf8')
    .toString()
    .replace(/--.*(\r\n|\n|\r)/gm, '') // remove lines with comments (in case we got some ';'s)
    .split(/;(\r\n|\n\r|\r|\n)/gm) // split into all statements (we can probably do this one better)
    .map(r => r.trim()) // Remove empty statements
    .filter(r => !!r.length),
};
