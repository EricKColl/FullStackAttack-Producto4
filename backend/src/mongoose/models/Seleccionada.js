import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const seleccionadaSchema = new Schema(
    {
        publicacionId: {
            type: Number,
            required: true,
            unique: true,
            index: true,
        },

        fechaSeleccion: {
            type: String,
            required: true,
            default: () => new Date().toISOString(),
        },
    },
    {
        collection: 'seleccionadas',
        timestamps: true,
    }
);

export const SeleccionadaMongoose = model(
    'Seleccionada',
    seleccionadaSchema
);