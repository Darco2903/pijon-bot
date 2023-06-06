CREATE TABLE
    playlist(
        id INT PRIMARY KEY AUTO_INCREMENT,
        type TEXT,
        name TEXT,
        author TEXT,
        userid TEXT,
        privacy TEXT,
        ytId TEXT,
        songs TEXT,
        creationDate TEXT,
        lastModified TEXT
    );

CREATE TABLE
    song(
        id INT PRIMARY KEY AUTO_INCREMENT,
        name TEXT,
        author TEXT,
        ytId TEXT,
        streamUrl TEXT,
        duration TEXT,
        user TEXT,
        userId TEXT,
        nbPlyed INT,
        creationDate TEXT,
        lastModified TEXT
    );