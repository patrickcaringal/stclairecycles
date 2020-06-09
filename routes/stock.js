const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Double = require('@mongoosejs/double');
const moment = require('moment');
const { User } = require('./user');

const Stock = mongoose.model(
    'Stock',
    new mongoose.Schema({
        stockNo: {
            type: String,
            required: true
        },
        productNo: {
            type: String,
            required: true
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        title: {
            type: String,
            required: true
        },
        // description: {
        //     type: String,
        //     required: true
        // },
        type: {
            type: String,
            required: true
        },

        cost: {
            type: Double,
            required: true
        },
        sellingPrice: {
            type: Double,
            required: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        stock: {
            type: Number,
            required: true
        },
        remainingStock: {
            type: Number,
            required: true
        },
        status: {
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

router.get('/', async (req, res, next) => {
    try {
        if (Object.keys(req.query).length === 0) {
            const stock = await Stock.find({ isActive: true }).populate('createdBy', 'firstname lastname');
            return res.send(stock);
        }

        // get by status
        const { status } = req.query;

        if (status) {
            const stock = await Stock.find({ status, isActive: true });
            return res.send(stock);
        }

        res.send('Uknown get mode');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.get('/report', async (req, res, next) => {
    try {
        let { startOrdered, endOrdered } = req.query;

        const stock = await Stock.find({
            dateCreated: {
                $gte: moment(startOrdered)
                    .startOf('day')
                    .toDate(),
                $lte: moment(endOrdered)
                    .endOf('day')
                    .toDate()
            },
            isActive: true
        }).populate('createdBy', 'firstname lastname');

        return res.send(stock);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.get('/product/:productId', async (req, res, next) => {
    try {
        const { productId } = req.params;

        // get all
        if (Object.keys(req.query).length === 0) {
            const stock = await Stock.find({ product: productId, isActive: true });
            return res.send(stock);
        }

        // get hasStock only
        const { hasStock } = req.query;
        if (hasStock) {
            const stock = await Stock.find({ product: productId, remainingStock: { $gt: 0 }, isActive: true });
            return res.send(stock);
        }

        res.send('Uknown get mode');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.get('/dashboard/cost', async (req, res, next) => {
    try {
        const stock = await Stock.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: { $dateToString: { format: '%m', date: '$dateCreated' } },
                    totalSaleAmount: { $sum: '$cost' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return res.send(stock);
    } catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { data, logs } = req.body;
        let { stocks } = data;

        stocks = stocks.map(async i => {
            const stockNo = await incrementCounter('Stock');

            return new Stock({
                ...i,

                status: 'stock',
                stockNo,

                dateCreated: new Date(),
                dateUpdated: new Date(),
                isActive: true
            });
        });

        stocks = await Promise.all(stocks);
        stocks = await Stock.insertMany(stocks);

        logs.activity += stocks.map(i => i.stockNo).toString();
        await User.findOneAndUpdate({ _id: logs.id }, { $push: { logs: { ...logs } } }, { useFindAndModify: false, new: true });

        res.send(stocks);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.put('/', async (req, res, next) => {
    try {
        const stock = await Stock.updateMany({}, { $set: { createdBy: '5e47870320d3ea0017b622d8' } });

        res.send(stock);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

module.exports = {
    router,
    Stock
};
