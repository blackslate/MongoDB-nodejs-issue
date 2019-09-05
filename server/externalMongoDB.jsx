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

      this.db.once("close", this.connectionClosed)
      // console.log("db " + this.db.databaseName + " now open")

      this.runSmokeTest()
    }
  }


  runSmokeTest() {
    if (this.db && this.db.databaseName) {    
      this.db.number = this.counter ++
      const name = this.db.databaseName + this.db.number
      console.log(`Database: ${name} now open`)

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
      // this.db.on("close", function() {
      //   console.log(message)}
      // )
      // this.db.removeAllListeners()

      this.db = null // DOESN'T THIS CLEAR THE .on("close") LISTENER?

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



function getMethods (obj) {
  let properties = new Set()
  let currentObj = obj
  do {
    Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
  } while ((currentObj = Object.getPrototypeOf(currentObj)))
  return [...properties.keys()].filter(item => typeof obj[item] === 'function')
}