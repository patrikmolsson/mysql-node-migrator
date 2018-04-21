# mysql-node-migrator
A library to keep track of change scripts for mysql databases in node, based upon [this repository](https://github.com/borsch/node-mysql-migration).

Uses [promise-mysql](https://github.com/lukeb-uk/node-promise-mysql) (which in turn uses [mysqljs/mysql](https://github.com/mysqljs/mysql)).

mysql-node-migrator uses only `.createConnection()`, which makes other connection options unavailable.

The migrator will create a table in the database, called `migration_schema`. 
This will keep track of the migrations that have been executed.

### Installation
To install, use npm:

```bash
$ npm install mysql-node-migrator
```

### Naming convention
The migrator depends on that the migrations are located in a folder.
It will search this folder for migration scripts using the following pattern:
`V{version}__{name}.sql` (regex: `/V(\d+)__([\w_]+)\.sql/`).

Examples:
```
V1__init_script.sql
V2__migrate_users.sql
```

The version number keeps track on in which order the scripts shall be executed.
When a migration script has been run, its version and name will be stored in the database,
preventing it from being run again.

### Connection
The migrator takes the following parameters: `connectionOptions` and `options`.

`connectionOptions` matches [mysqljs connection options](https://github.com/mysqljs/mysql#connection-options).

`options` is an object with the following structure:

```javascript
const options = {
  folder: 'sqlMigrations', // The relative path to the folder where the sql scripts are located
  loggingFunction: console, // (optional, default console) The logger function to use (e.g. winston)
  logging: true, // (optional, default true) Whether the migrator shall log its progress
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

### Multiple statements

In order to execute a script with multiple statements, set `connectionOptions.multipleStatements = true`.

