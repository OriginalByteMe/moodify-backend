import knex from 'knex';
import 'dotenv/config';
import pg from 'pg';
import knexConfig from '../../knexfile.js';

const environment = process.env.NODE_ENV || 'development';

const db = knex(knexConfig[environment]);

pg.types.setTypeParser(20, parseInt);
pg.types.setTypeParser(1700, parseFloat);

// Check database connection when the app starts
async function checkConnection() {
  try {
    await db.raw('SELECT 1');
    console.log('Successfully connected to PostgreSQL database');
    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  }
}

checkConnection();

export default db;

export const tracksCollection = {
  findOne: async (query) => {
    return db('tracks').where(query).first();
  },
  
  find: async (query) => {
    return db('tracks').where(query);
  },
  
  insertOne: async (document) => {
    return db('tracks').insert(document).returning('*');
  },
  
  insertMany: async (documents) => {
    return db('tracks').insert(documents).returning('*');
  },
  
  updateOne: async (query, update) => {
    return db('tracks').where(query).update(update).returning('*');
  },
  
  upsert: async (query, document) => {
    const exists = await db('tracks').where(query).first();
    if (exists) {
      return db('tracks').where(query).update(document).returning('*');
    } else {
      return db('tracks').insert(document).returning('*');
    }
  },
  
  deleteOne: async (query) => {
    return db('tracks').where(query).del();
  }
};

export const albumCollection = {
  findOne: async (query) => {
    return db('albums').where(query).first();
  },
  
  find: async (query) => {
    return db('albums').where(query);
  },
  
  insertOne: async (document) => {
    return db('albums').insert(document).returning('*');
  },
  
  insertMany: async (documents) => {
    return db('albums').insert(documents).returning('*');
  },
  
  updateOne: async (query, update) => {
    return db('albums').where(query).update(update).returning('*');
  },
  
  upsert: async (query, document) => {
    const exists = await db('albums').where(query).first();
    if (exists) {
      return db('albums').where(query).update(document).returning('*');
    } else {
      return db('albums').insert(document).returning('*');
    }
  },
  
  deleteOne: async (query) => {
    return db('albums').where(query).del();
  }
};