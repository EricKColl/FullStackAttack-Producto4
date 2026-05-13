import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { PublicacionMongoose } from '../mongoose/models/Publicacion.js';

await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDbName
});

const publicaciones = await PublicacionMongoose.find();

console.log(publicaciones);

await mongoose.disconnect();