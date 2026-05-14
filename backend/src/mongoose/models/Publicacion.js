import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const publicacionSchema = new Schema(
    {
        id: {
            type: Number,
            required: true,
            unique: true
        },

        tipo: {
            type: String,
            required: true,
            enum: ['oferta', 'demanda']
        },

        titulo: {
            type: String,
            required: true,
            trim: true
        },

        categoria: {
            type: String,
            required: true,
            trim: true
        },

        autor: {
            type: String,
            required: true,
            trim: true
        },

        ubicacion: {
            type: String,
            required: true,
            trim: true
        },

        descripcion: {
            type: String,
            required: true,
            minlength: 10,
            trim: true
        },

        emailContacto: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        fecha: {
            type: String,
            required: true
        }
    },
    {
        collection: 'publicaciones',
        timestamps: true
    }
);

export const PublicacionMongoose = model(
    'Publicacion',
    publicacionSchema
);