# MongoDB-nodejs-issue: steps to reproduce

## Create a bare-bones test app
```
meteor create --react deadpool && cd deadpool
meteor npm install --save mongodb
```

## Remove the files at :
- deadpool/imports/api/links.js
- deadpool/imports/ui/Hello.jsx
- deadpool/imports/ui/Info.jsx

## Modify files
**`import/ui/App.jsx`**
```
import React from 'react';

const App = () => (
  <div>
    <h1>Dead pool</h1>
    <p>Nothing to see here. Look in the Terminal window</p>
  </div>
);

export default App;
```
**`server/main.js`**
```
import './externalMongoDB'
```
## Create a new file
**`externalMongoDB`**
```javascript
// Adapted from https://mongodb.github.io/node-mongodb-native/3.3/quick-start/quick-start/
"use strict"

import { MongoClient } from 'mongodb'



class ExternalMongoDB {
  constructor({ host, port, dbName }) {
    this.dbName = dbName
    this.url    = `mongodb://${host}:${port}`

    // Dealing with lack of connection
    this.connectionCallback = this.connectionCallback.bind(this)
    this.connectionClosed   = this.connectionClosed.bind(this)
    this.connect            = this.connect.bind(this)

    this.connected  = false
    this.retryDelay = 1000

    this.counter    = 1

    // Ensure DeprecationWarnings are not shown in the Terminal 
    const options = {
      useNewUrlParser:    true
    , useUnifiedTopology: true
    }
    this.client = new MongoClient(this.url, options)

    this.connect()
  }


  connect() {
    console.log(`Attempting to connect to ${this.url}...`)
    this.client.connect(this.connectionCallback)
  }


  connectionCallback(error, result) {
    console.log(
      "\nconnectionCallback\nthis.db is:"
    , (this.db ? this.db.databaseName + this.db.number : this.db)
    , "\n")

    if (error) {
      console.log(error.message)
      // Try to connect again later
      setTimeout(this.connect, this.retryDelay)

    } else {
      console.log(`Connected successfully to ${this.url}`)

      this.connected  = true

      this.db = this.client.db(this.dbName)
      this.db.number = this.counter ++
      this.db.on("close", this.connectionClosed)
      console.log("db " + this.db.databaseName + " now open")

      this.runSmokeTest()
    }
  }


  runSmokeTest() {
    if (this.db && this.db.databaseName) {
      console.log(`Database: ${this.db.databaseName + this.db.number}`)
    
      const promise = this.db.createCollection("smokeTest")

      promise.then(
        () => console.log("smokeTest passed")
      ).catch(
        reason => console.log("smokeTest failed", reason)
      )

    } else { 
      console.log("Unexpected value for this.db:\n", this.db)
    }
  }


  closeConnection() {
    this.connected = false
    this.client.close().then(
      (success) => console.log(`Connection to ${this.url} closed\n`)

    , (failure) => console.log(
        `Error closing connection to ${this.url}\n`
      , failure
      )
    )
  }


  connectionClosed() {
    console.log(
      "\nconnectionClosed event. this.db is:\n"
    , (this.db ? this.db.databaseName + this.db.number : this.db)
    )

    if (this.db) {
      const message = "db "+this.db.number+" is calling from the dead"
      this.db.on("close", function() {
        console.log(message)}
      )
```
**`      this.db = null // DOESN'T THIS CLEAR THE .on("close") LISTENER?`**
```
      if (this.connected) {
        // The connection broke. (It was not deliberately shut down by
        // closeConnection). Try to reopen the connection.
        this.connected = false
        this.connect()
      }
    }
  }
}


const externalDB = new ExternalMongoDB({
  dbName: "test_db"
, host:   "localhost"
, port:   27017
})


export default externalDB
```
## Install MongoDB Community Edition
See [official documentation](https://docs.mongodb.com/manual/administration/install-community/)
Ensure that the server is running on `localhost://27017`, or modify the `host` and `port` values at the end of the externalMongoDB.jsx script, so that the Node.js MongoDB Driver knows where to find the server.

## Start the Meteor app
In a Terminal window, `cd` into the `barebones` directory, and run `meteor`

## Stop and start the MongoDB server several times
Wait for the Meteor Terminal window to show `=> App running at: http://localhost:3000/
`, then in a second Terminal window, run the following commands, with a second or two between each:
```
sudo service mongodb stop
sudo service mongodb start
sudo service mongodb stop
sudo service mongodb start
sudo service mongodb stop
sudo service mongodb start
sudo service mongodb stop
```
## Observe the results
Stop the Meteor app (Ctrl-C in its Terminal window) and observe the output. Here is the edited output from my Terminal window. I've removed all the timestamps and the STDERR output, and left only one cyle of connection errors. (The ... lines means that the same output repeats every second while the `mongodb` service is stopped.)

```
=> App running at: http://localhost:3000/
 
 connectionClosed event. this.db is:
  test_db1
 Attempting to connect to mongodb://localhost:27017...
 
 connectionCallback
 this.db is: null 
 
 connect ECONNREFUSED 127.0.0.1:27017
 Attempting to connect to mongodb://localhost:27017...
 
 connectionCallback
 this.db is: null 

 ...
 
 Connected successfully to mongodb://localhost:27017
 db test_db now open
 Database: test_db2
 smokeTest passed
 
 connectionClosed event. this.db is:
  test_db2
 Attempting to connect to mongodb://localhost:27017...
 db 1 is calling from the dead
 
  connectionClosed event. this.db is:
  null

  ...
 
 connectionCallback
 this.db is: null
 
 Connected successfully to mongodb://localhost:27017
 db test_db now open
 Database: test_db3
 smokeTest passed
 
 connectionClosed event. this.db is:
  test_db3
 Attempting to connect to mongodb://localhost:27017...
 db 1 is calling from the dead
 
 connectionClosed event. this.db is:
  null
 db 2 is calling from the dead
 
 connectionClosed event. this.db is:
  null
 
 connectionCallback
 this.db is: null 
 
 connect ECONNREFUSED 127.0.0.1:27017
 Attempting to connect to mongodb://localhost:27017...
 
 connectionCallback
 this.db is: null

 ...
 
 Connected successfully to mongodb://localhost:27017
 db test_db now open
 Database: test_db4
 smokeTest passed
 ```

## Conclusion
It would appear that the `.on("close", ...)` listeners added to the database instances are not being cleared up when `this.db` is set to `null`. The [official documentation](http://mongodb.github.io/node-mongodb-native/3.2/api/Db.html#collection) for the `Db` object does not describe the `on` method, although it does mention the events that the `Db` instance fires.

## SOLUTION
By running the `getAllMethods` function (shown below) on the `Db` instance, I discover that the `Db` instance has 21 undocumented methods of its own, including `removeAllListeners`.
```
addChild
addListener
domain
emit
eventNames
getLogger
getMaxListeners
listenerCount
listeners
on
once
options
prependListener
prependOnceListener
profilingInfo
```
**`removeAllListeners`**
```
removeListener
setMaxListeners
slaveOk
topology
writeConcern
```
Running `this.db.removeAllListeners()` before setting `this.db = null` solved the issue. An alternative solution is to use `this.db.once("close", [function])`, so that the listener is removed automatically.

#### getMethods function
(source: [https://flaviocopes.com/how-to-list-object-methods-javascript/])
```
function getMethods (obj) {
  let properties = new Set()
  let currentObj = obj
  do {
    Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
  } while ((currentObj = Object.getPrototypeOf(currentObj)))
  return [...properties.keys()].filter(item => typeof obj[item] === 'function')
}
```
