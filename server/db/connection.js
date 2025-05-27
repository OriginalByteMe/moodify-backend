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

export const spotifyCollection = {
  findOne: async (query) => {
    return db('spotify').where(query).first();
  },
  
  find: async (query) => {
    return db('spotify').where(query);
  },
  
  insertOne: async (document) => {
    return db('spotify').insert(document).returning('*');
  },
  
  insertMany: async (documents) => {
    return db('spotify').insert(documents).returning('*');
  },
  
  updateOne: async (query, update) => {
    return db('spotify').where(query).update(update).returning('*');
  },
  
  upsert: async (query, document) => {
    const exists = await db('spotify').where(query).first();
    if (exists) {
      return db('spotify').where(query).update(document).returning('*');
    } else {
      return db('spotify').insert(document).returning('*');
    }
  },
  
  deleteOne: async (query) => {
    return db('spotify').where(query).del();
  }
};