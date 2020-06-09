const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Double = require('@mongoosejs/double');
const moment = require('moment');
const { User } = require('./user');

const Supply = mongoose.model(
    'Supply',
    new mongoose.Schema({
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        },
        used: {
            type: Number,
            required: true
        },
        price: {
            type: Double,
            required: true
        },
        reason: {
            type: String,
            required: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
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
        const supply = await Supply.find({ isActive: true }).populate('user', 'firstname lastname');

        return res.send(supply);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.get('/report', async (req, res, next) => {
    try {
        let { start, end } = req.query;
        console.log(start, end);

        const supply = await Supply.find({
            dateCreated: {
                $gte: moment(start)
                    .startOf('day')
                    .toDate(),
                $lte: moment(end)
                    .endOf('day')
                    .toDate()
            },
            isActive: true
        }).populate('user', 'firstname lastname');

        return res.send(supply);
    } catch (e) {
        console.log(e.message);
        res.status(500).send(e.message);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { data, logs } = req.body;
        let { supplies } = data;

        supplies = supplies.map(async i => {
            return new Supply({
                ...i,

                dateCreated: new Date(),
                dateUpdated: new Date(),
                isActive: true
            });
        });

        supplies = await Promise.all(supplies);
        supplies = await Supply.insertMany(supplies);

        logs.activity += supplies.map(i => i.title).toString();
        await User.findOneAndUpdate({ _id: logs.id }, { $push: { logs: { ...logs } } }, { useFindAndModify: false, new: true });

        res.send(supplies);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

module.exports = {
    router
};
