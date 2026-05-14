import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { SeleccionadaMongoose } from '../mongoose/models/Seleccionada.js';

await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDbName,
});

const seleccionadas = await SeleccionadaMongoose.find();

console.log(seleccionadas);

await mongoose.disconnect();