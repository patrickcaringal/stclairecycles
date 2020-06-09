const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Other = mongoose.model(
    'Other',
    new mongoose.Schema({
        tax: Number,
        entity: {
            type: String,
            required: true
        },

        dateCreated: {
            type: Date,
            required: true
        },
        dateUpdated: {
            type: Date,
            required: true
        },
        isActive: {
            type: Boolean,
            required: true
        }
    })
);

router.get('/tax', async (req, res, next) => {
    try {
        const tax = await Other.find({ entity: 'tax' });

        if (!tax.length) return res.status(404).send('Tax not found.');

        res.send(tax[0]);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const { data, logs } = req.body;

        const other = await Other.findOneAndUpdate({ _id: req.params.id }, { ...data }, { useFindAndModify: false, new: true });
        if (!other) return res.status(404).send('Entity not found.');
        res.send(other);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

module.exports = {
    router
};
