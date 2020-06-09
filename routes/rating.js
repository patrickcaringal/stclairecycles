const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User } = require('./user');

const Rating = mongoose.model(
    'Rating',
    new mongoose.Schema({
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer'
        },
        feedback: {
            type: String
        },
        rating: {
            type: Number,
            required: true
        },
        approved: {
            type: Boolean
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

router.get('/', async (req, res, next) => {
    try {
        const rating = await Rating.find({ feedback: { $nin: [null, ''] }, approved: { $nin: [true] }, isActive: true })
            .populate('product', 'productNo title image')
            .populate('customer', 'customerNo firstname lastname email contactNo')
            .select('-dateUpdated -isActive -__v');

        res.send(rating);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.get('/product/:id', async (req, res, next) => {
    try {
        const { id: product } = req.params;

        const rating = await Rating.find({ product, feedback: { $nin: [null, ''] }, approved: true, isActive: true })
            .populate('customer', 'firstname lastname')
            .select('customer feedback rating dateCreated');

        res.send(rating);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.put('/', async (req, res, next) => {
    try {
        const rating = await Rating.updateMany({}, { $set: { isActive: true, approved: false } });

        res.send(rating);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const { data, logs } = req.body;

        const rating = await Rating.findOneAndUpdate({ _id: req.params.id }, { ...data }, { useFindAndModify: false, new: true }).populate('stock', 'remainingStock');
        if (!rating) return res.status(404).send('Rating not found.');

        await User.findOneAndUpdate({ _id: logs.id }, { $push: { logs: { ...logs } } }, { useFindAndModify: false, new: true });

        res.send(rating);
    } catch (e) {
        console.log(e.message);
        res.status(500).send(e.message);
    }
});

module.exports = {
    router,
    Rating
};
