import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import {DbSchema} from '../types';

const defaultJsonFile = './deployed-contracts.json';

const getDb = (jsonfile: string = defaultJsonFile): low.LowdbSync<DbSchema> => low(new FileSync<DbSchema>(jsonfile));

export default getDb;
