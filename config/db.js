/* import pkg from 'pg';
const { Pool } = pkg;
import "dotenv/config";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // necessário para Neon
});

 */
import {neon} from "@neondatabase/serverless"

import "dotenv/config";

//Criacao de uma conexao simples
export const sql = neon(process.env.DATABASE_URL)

