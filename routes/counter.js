const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Counter = mongoose.model(
    'Counter',
    new mongoose.Schema({
        referenceCollection: {
            type: String,
            required: true
        },
        base: {
            type: String,
            required: true
        },
        count: {
            type: Number,
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

router.get('/', async (req, res, next) => {
    const counter = await Counter.find();
    res.send(counter);
});

router.get('/:id', async (req, res, next) => {
    try {
        const counter = await Counter.findById(req.params.id);

        if (!counter) return res.status(404).send('Counter not found.');

        res.send(counter);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.post('/', async (req, res, next) => {
    try {
        let counter = await Counter.countDocuments({
            referenceCollection: req.body.referenceCollection
        });

        if (counter) return res.status(404).send('Counter already exist.');

        counter = new Counter({
            ...req.body,

            dateCreated: new Date(),
            dateUpdated: new Date(),
            isActive: true
        });

        counter = await counter.save();
        res.send(counter);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const counter = await Counter.findOneAndUpdate({ _id: req.params.id }, req.body, { useFindAndModify: false, new: true });

        if (!counter) return res.status(404).send('Counter not found.');

        res.send(counter);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.delete('/', async (req, res, next) => {
    const counter = await Counter.deleteMany({});
    res.send(counter);
});

router.delete('/:id', async (req, res, next) => {
    try {
        const counter = await Counter.findOneAndDelete({ _id: req.params.id });

        if (!counter) return res.status(404).send('Counter not found.');

        res.send(counter);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

incrementCounter = async referenceCollection => {
    try {
        let counter = await Counter.find({ referenceCollection });
        // console.log(counter.length);
        if (counter.length === 0) throw 'Counter not found.';

        counter = counter[0];
        counter = await Counter.findOneAndUpdate({ _id: counter._id }, { $inc: { count: 1 } }, { useFindAndModify: false, new: true });

        const base = counter.base;
        const count = counter.count.toString();

        const counterNo = base.substring(0, base.length - count.length) + count;

        return counterNo;
    } catch (e) {
        // res.status(500).send(e.message);
        console.log(e);
        return Error(e);
    }
};

module.exports = {
    router,
    Counter,
    incrementCounter
};
