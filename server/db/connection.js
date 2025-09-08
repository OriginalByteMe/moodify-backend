import knex from 'knex';
import 'dotenv/config';
import pg from 'pg';
import knexConfig from '../../knexfile.js';

// Configure PostgreSQL type parsers globally
pg.types.setTypeParser(20, parseInt);
pg.types.setTypeParser(1700, parseFloat);

/**
 * Create a database connection with the given configuration
 * @param {Object|string} config - Knex config object or connection string
 * @returns {Object} - Knex database instance
 */
export function createDatabaseConnection(config = null) {
  let dbConfig;
  
  if (typeof config === 'string') {
    // Connection string provided (for TestContainers)
    dbConfig = {
      client: 'pg',
      connection: config,
      migrations: {
        directory: './migrations'
      }
    };
  } else if (config) {
    // Custom config object provided
    dbConfig = config;
  } else {
    // Use environment-based configuration
    const environment = process.env.NODE_ENV || 'development';
    dbConfig = knexConfig[environment];
  }
  
  return knex(dbConfig);
}

// Check database connection
async function checkConnection(db) {
  try {
    await db.raw('SELECT 1');
    console.log('Successfully connected to PostgreSQL database');
    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  }
}





/**
 * Create tracks collection interface for a given database connection
 * @param {Object} database - Knex database instance
 * @returns {Object} - Tracks collection interface
 */
export function createTracksCollection(database) {
  return {
    findOne: async (query) => {
      return database('tracks').where(query).first();
    },
    
    find: async (query) => {
      return database('tracks').where(query);
    },
    
    insertOne: async (document) => {
      return database('tracks').insert(document).returning('*');
    },
    
    insertMany: async (documents) => {
      return database('tracks').insert(documents).returning('*');
    },
    
    updateOne: async (query, update) => {
      return database('tracks').where(query).update(update).returning('*');
    },
    
    upsert: async (query, document) => {
      const exists = await database('tracks').where(query).first();
      if (exists) {
        return database('tracks').where(query).update(document).returning('*');
      } else {
        return database('tracks').insert(document).returning('*');
      }
    },
    
    deleteOne: async (query) => {
      return database('tracks').where(query).del();
    }
  };
}

/**
 * Create albums collection interface for a given database connection
 * @param {Object} database - Knex database instance
 * @returns {Object} - Albums collection interface
 */
export function createAlbumCollection(database) {
  return {
    findOne: async (query) => {
      return database('albums').where(query).first();
    },
    
    find: async (query) => {
      return database('albums').where(query);
    },
    
    insertOne: async (document) => {
      return database('albums').insert(document).returning('*');
    },
    
    insertMany: async (documents) => {
      return database('albums').insert(documents).returning('*');
    },
    
    updateOne: async (query, update) => {
      return database('albums').where(query).update(update).returning('*');
    },
    
    upsert: async (query, document) => {
      const exists = await database('albums').where(query).first();
      if (exists) {
        return database('albums').where(query).update(document).returning('*');
      } else {
        return database('albums').insert(document).returning('*');
      }
    },
    
    deleteOne: async (query) => {
      return database('albums').where(query).del();
    }
  };
}

