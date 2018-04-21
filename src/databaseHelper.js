export default {
  /**
   * create empty migration schema table
   *
   * @param connection {Connection}
   */
  insertTable: (connection) => {
    const query = `CREATE TABLE IF NOT EXISTS \`migration_schema\` (
                    \`version\` INT PRIMARY KEY,
                    \`name\` TEXT NOT NULL,
                    \`date\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE = InnoDB`;

    return connection.query(query);
  },
  insertMigrationInformation: (connection, migrationScript) => {
    const toInsert = {
      version: migrationScript.version,
      name: migrationScript.name,
    };

    return connection.query('INSERT INTO migration_schema SET ?', toInsert);
  },

  /**
   * @param connection {Connection} -  to work with database
   */
  getExistingMigrations: connection => connection.query('SELECT * FROM migration_schema'),
};
