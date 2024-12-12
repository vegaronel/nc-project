import pkg from 'pg';
const {Pool} = pkg;
import {config} from 'dotenv'
config()
const pool = new Pool({
    user: process.env.db_User,
    host: process.env.db_host,
    database: process.env.db_Database,
    password:process.env.db_Password,
    port: process.env.db_Port
})

export default pool

