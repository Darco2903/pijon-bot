const orm = require("typeorm");

class DataBase {
    /**
     * @param {orm.DatabaseType} type
     * @param {string} host
     * @param {Number} port
     * @param {string} username
     * @param {string} password
     * @param {string} database
     * @param {orm.EntitySchema[]} entities
     * @returns {DataBase}
     */
    constructor(type, host, port, username, password, database, entities) {
        this.connected = false;
        this.initConn = false;
        this.dataSource = new orm.DataSource({
            type,
            host,
            port,
            username,
            password,
            database,
            entities,
            cache: true,
        });
    }

    /**
     * @returns {Promise<void>}
     */
    async connect() {
        if (this.connected || this.initConn) return;
        this.initConn = true;
        try {
            await this.dataSource.initialize();
            await this.dataSource.synchronize();
            this.connected = true;
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Async Version
     * Look up a document by the fieldName and fieldValue in a repo by name.
     * @param {string} fieldName String of the field name.
     * @param fieldValue String of the field value.
     * @param {string} repoName String of the repo name.
     * @returns {Promise<Object>} Returns an Object.
     */
    fetchDataAsync(fieldName, fieldValue, repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            repo.findOne({ where: { [fieldName]: fieldValue } })
                .then((res) => {
                    return resolve(res);
                })
                .catch((err) => {
                    console.error(err);
                    return reject(undefined);
                });
        });
    }

    /**
     * Async Version
     * Look up document with the highest id in repo.
     * @param {string} repoName ie "Account"
     * @returns {Promise<Object>} Returns an Object.
     */
    fetchLastIdAsync(repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            repo.findOne({ order: { id: "DESC" } })
                .then((res) => {
                    return resolve(res);
                })
                .catch((err) => {
                    return reject(undefined);
                });
        });
    }

    /**
     * Async Version
     * Look up all documents by the fieldName and fieldValue in a repo by name.
     * @param {string} fieldName The name of the field.
     * @param fieldValue The value of that field.
     * @param {string} repoName The reponame where to look.
     * @returns {Promise<Object[]>} Returns an array of Objects.
     */
    fetchAllByFieldAsync(fieldName, fieldValue, repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            repo.find({ where: { [fieldName]: fieldValue } })
                .then((res) => {
                    return resolve(res);
                })
                .catch((err) => {
                    console.error(err);
                    return reject(undefined);
                });
        });
    }

    /**
     * Async Version
     * Update or Insert a new document.
     * @param {Object} document Document pulled down from table.
     * @param {string} repoName The name of the table.
     * @returns {Promise<Object>} Returns the upserted Object.
     */
    upsertDataAsync(document, repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            repo.save(document)
                .then((res) => {
                    return resolve(res);
                })
                .catch((err) => {
                    console.error(err);
                    return reject(undefined);
                });
        });
    }

    /**
     * Async Version
     * @param {Object} document Document pulled down from table.
     * @param {string} repoName The name of the table.
     * @returns {Promise<Object>} Returns the inserted Object.
     */
    insertDataAsync(document, repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            repo.insert(document)
                .then((res) => {
                    return resolve(res);
                })
                .catch((err) => {
                    console.error(err);
                    return reject(undefined);
                });
        });
    }

    /**
     * Async Version
     * Update partial data for a document; based on object data based.
     * @param {Number} id ID of Document
     * @param {Object} partialObjectData
     * @param {string} repoName The name of the table.
     * @returns {Promise<Object>} Returns the updated Object.
     */
    updatePartialDataAsync(id, partialObjectData, repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            repo.findByIds([id])
                .then((res) => {
                    // Resolve undefined if no documents found
                    if (res.length <= 0) return resolve(undefined);

                    repo.update(id, partialObjectData)
                        .then((res) => {
                            return resolve(res);
                        })
                        .catch((err) => {
                            return reject(undefined);
                        });
                })
                .catch((err) => {
                    return reject(undefined);
                });
        });
    }

    /**
     * Async Version
     * Fetch documents by ID or IDs.
     * @param {Number|Number[]} ids Can be array or single id.
     * @param {string} repoName The name of the table.
     * @returns {Promise<Object[]>} Returns an array of Objects.
     */
    fetchByIdsAsync(ids, repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            const idRef = Array.isArray(ids) ? ids : [ids];
            repo.findByIds(idRef)
                .then((res) => {
                    // if (res.length <= 0) return resolve(undefined);
                    return resolve(res);
                })
                .catch((err) => {
                    console.error(err);
                    return reject(undefined);
                });
        });
    }

    /**
     * Async Version
     * Delete documents from the database by ID.
     * @param {Number|Number[]} ids Can be array or single id.
     * @param {string} repoName The name of the table.
     * @returns {Promise<Object[]>} Returns an array of Objects.
     */
    deleteByIdsAsync(ids, repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            const idRef = Array.isArray(ids) ? ids : [ids];
            repo.delete(idRef)
                .then((res) => {
                    return resolve(res);
                })
                .catch((err) => {
                    console.error(err);
                    return reject(undefined);
                });
        });
    }

    /**
     * Async Version
     * Fetch all documents by repo name.
     * @param {string} repoName The name of the table.
     * @returns {Promise<Object[]>} Returns an array of Objects.
     */
    fetchAllDataAsync(repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            repo.find()
                .then((res) => {
                    // if (res.length <= 0) return reject(undefined);
                    return resolve(res);
                })
                .catch((err) => {
                    console.error(err);
                    return reject(undefined);
                });
        });
    }

    /**
     * Async Version
     * Select a table by fieldNames that apply.
     * @param {string} repoName
     * @param {string[]} fieldNamesArray
     * @returns {Promise<Object[]>} Returns an array of Objects.
     */
    selectDataAsync(repoName, fieldNamesArray) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            const selectionRef = Array.isArray(selectionRef) ? selectionRef : [selectionRef];
            repo.find({ select: selectionRef })
                .then((res) => {
                    // if (res.length <= 0) return reject(undefined);
                    return resolve(res);
                })
                .catch((err) => {
                    console.error(err);
                    return reject(undefined);
                });
        });
    }
}

module.exports = DataBase;
