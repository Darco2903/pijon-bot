const orm = require("typeorm");

class DataBase {
    constructor(client, type, host, port, username, password, database, entities) {
        this.client = client;
        this.connected = false;
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

    async connect() {
        this.client.Log.info(`Starting Database Connection`);
        try {
            await this.dataSource.initialize();
            this.dataSource.synchronize();
            this.connected = true;
            this.client.Log.info(`Database connection established`);
        } catch (error) {
            this.client.Log.error(`Unable to make database connection: ${error.toString()}`);
            console.log(error);
        }
    }



    /**
     * Async Version
     * Look up a document by the fieldName and fieldValue in a repo by name.
     * @param fieldName String of the field name.
     * @param fieldValue String of the field value.
     * @param repoName ie. "Account"
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
     * @param repoName ie "Account"
     */
    fetchLastIdAsync(repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);
            repo.findOne({ order: { id: "DESC" } })
                .then((res) => {
                    return resolve(res);
                })
                .catch((err) => {
                    alt.logError(err);
                    return reject(undefined);
                });
        });
    }

    /**
     *
     * @param fieldName The name of the field.
     * @param fieldValue The value of that field.
     * @param repoName The reponame where to look.
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
     * @param document Document pulled down from table.
     * @param repoName The name of the table.
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
     * @param document Document pulled down from table.
     * @param repoName The name of the table.
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
     * @param id ID of Document
     * @param partialObjectData Object
     * @param repoName The name of the table.
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
                            alt.logError(err);
                            return reject(undefined);
                        });
                })
                .catch((err) => {
                    alt.logError(err);
                    return reject(undefined);
                });
        });
    }

    /**
     * Async Version
     * Fetch documents by ID or IDs.
     * @param ids
     * @param repoName The name of the table.
     */
    fetchByIdsAsync(ids, repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);
            let idRef = ids;

            if (!Array.isArray(ids)) {
                idRef = [ids];
            }

            repo.findByIds(idRef)
                .then((res) => {
                    if (res.length <= 0) return resolve(undefined);
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
     * @param ids Can be array or single id.
     * @param repoName The name of the table.
     */
    deleteByIdsAsync(ids, repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            let idRef = ids;

            if (!Array.isArray(ids)) {
                idRef = [ids];
            }

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
     * Fetch all documents by repo name.
     * @param repoName The name of the table.
     */
    fetchAllDataAsync(repoName) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            repo.find()
                .then((res) => {
                    if (res.length <= 0) return reject(undefined);
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
     * @param repoName
     * @param fieldNamesArray
     */
    selectDataAsync(repoName, fieldNamesArray) {
        return new Promise((resolve, reject) => {
            const repo = this.dataSource.getRepository(repoName);

            let selectionRef = fieldNamesArray;

            if (!Array.isArray(fieldNamesArray)) {
                selectionRef = [selectionRef];
            }

            repo.find({ select: selectionRef })
                .then((res) => {
                    if (res.length <= 0) return reject(undefined);
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
