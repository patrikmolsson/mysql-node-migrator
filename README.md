# mysql-node-migrator
A library to keep track of change scripts for mysql databases in node.

Uses [promise-mysql](https://github.com/lukeb-uk/node-promise-mysql) (which in turn uses [mysqljs/mysql](https://github.com/mysqljs/mysql)).

To install, use npm:

```bash
$ npm install mysql-node-migrator
```

mysql-node-migrator uses only `.createConnection()`, which makes other connection options unavailable.


## Usage

The migrator will create a table in the database, called `migration_schema`. 
This will keep track of the migrations that have been executed.

The migrator depends on that the migrations are located in a folder.
It will search this folder for migration scripts using the following pattern:
`V{version}__{name}.sql` (regex: `/V(\d+)__([\w_]+)\.sql/`).

The version number keeps track on in which order the scripts shall be executed.
When a migration script has been run, its version and name will be stored in the database,
preventing it from being run again.

The migrator takes the following parameters: `connectionOptions` and `options`.

`connectionOptions` matches [mysqljs connection options](https://github.com/mysqljs/mysql#connection-options).

`options` is an object with the following structure:

```javascript
const options = {
  folder: 'sqlMigrations', // The relative path to the folder where the sql scripts are located
  logger: console, // (optional, default console) The logger function to use (e.g. winston)
  logging: true // (optional, default true) Whether the migrator shall log its progress
}
```

Import and execute the migrator as follows:

```javascript
import migrator from 'mysql-node-migrator';

const options = {
  folder: 'sql_migrations',
};

migrator(databaseConfig, options).then(() => {
  // Migrations finished, do something
});
```

