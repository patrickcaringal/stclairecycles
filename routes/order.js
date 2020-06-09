const express = require('express');
const router = express.Router();
// const stripe = require('stripe')('sk_test_KoHI9S2p4QJ88RmNr3v2gKGW00Hh4FbSLE');
const stripe = require('stripe')('sk_live_ZdTJcdF100WrKk4DFaioWgfo00fRiOZXkp');
const mongoose = require('mongoose');
const Double = require('@mongoosejs/double');
const moment = require('moment');
const { Stock } = require('./stock');
const { incrementCounter } = require('./counter');
const { Rating } = require('./rating');
const { User } = require('./user');

const Order = mongoose.model(
    'Order',
    new mongoose.Schema({
        orderNo: {
            type: String,
            required: true
        },
        orderCount: {
            type: Number,
            required: true
        },

        tax: {
            type: Double,
            required: true
        },
        subtotal: {
            type: Double,
            required: true
        },
        taxAmount: {
            type: Double,
            required: true
        },
        shippingFee: {
            type: Double,
            required: true
        },
        total: {
            type: Double,
            required: true
        },

        shipTo: {
            description: { type: String },
            address: { type: String }
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer'
        },
        orders: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product'
                },
                stock: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Stock'
                },
                quantity: {
                    type: Number,
                    required: true
                },
                price: {
                    type: Double,
                    required: true
                },
                total: {
                    type: Double,
                    required: true
                },
                hasRating: {
                    type: Boolean
                }
            }
        ],

        // paymentId: { type: String },
        // receipt_url: { type: String },
        status: { type: String, required: true },
        // card: { type: String },
        // last4: { type: String },

        approvedBy: {
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
    const { status } = req.query;
    let order;

    switch (status) {
        case 'succeeded':
        case 'shipping':
        case 'delivered':
            order = await Order.find({ status, isActive: true })
                .populate('customer', 'customerNo firstname lastname email contactNo')
                .populate('orders.product', 'productNo title image reserve')
                .populate('updatedBy', 'firstname lastname')
                .select('-dateUpdated -isActive -__v');

            return res.send(order);

        default:
            order = await Order.find({ isActive: true })
                .populate('customer', 'customerNo firstname lastname email contactNo')
                .populate('orders.product', 'productNo title image reserve')
                .populate('updatedBy', 'firstname lastname')
                .select('-dateUpdated -isActive -__v');

            return res.send(order);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'customerNo firstname lastname email contactNo')
            .populate('orders.product', 'productNo title image type')
            .select('-dateUpdated -isActive -__v');

        if (!order) return res.status(404).send('Order not found.');

        res.send(order);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.get('/customer/:id', async (req, res, next) => {
    try {
        const order = await Order.find({ customer: req.params.id, isActive: true })
            .populate('customer', 'customerNo firstname lastname email contactNo')
            .populate('orders.product', 'productNo title image')
            .populate('updatedBy', 'firstname lastname')
            .select('-dateUpdated -isActive -__v');

        res.send(order);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.get('/report/sales', async (req, res, next) => {
    try {
        let { startOrdered, endOrdered } = req.query;

        const order = await Order.find({
            dateCreated: {
                $gte: moment(startOrdered)
                    .startOf('day')
                    .toDate(),
                $lte: moment(endOrdered)
                    .endOf('day')
                    .toDate()
            },
            // status: 'delivered',
            isActive: true
        })
            .populate('customer', 'customerNo firstname lastname email contactNo')
            .populate('orders.product', 'productNo title image reserve')
            .populate('updatedBy', 'firstname lastname')
            .select('-dateUpdated -isActive -__v');

        return res.send(order);
    } catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
});

router.get('/report/income', async (req, res, next) => {
    try {
        let { startOrdered, endOrdered } = req.query;

        const sales = await Order.aggregate([
            {
                $match: {
                    dateCreated: {
                        $gte: moment(startOrdered)
                            .startOf('day')
                            .toDate(),
                        $lte: moment(endOrdered)
                            .endOf('day')
                            .toDate()
                    },
                    isActive: true
                }
            },
            { $unwind: '$orders' },
            {
                $lookup: {
                    from: 'stocks',
                    localField: 'orders.stock',
                    foreignField: '_id',
                    as: 'stocks'
                }
            },
            {
                $addFields: {
                    product: '$orders.product',
                    quantity: '$orders.quantity',
                    salestotal: '$orders.total',
                    cost: { $arrayElemAt: ['$stocks.cost', 0] }
                }
            },
            {
                $project: {
                    product: 1,
                    quantity: 1,
                    salestotal: 1,
                    expensetotal: { $multiply: ['$cost', '$quantity'] }
                }
            },
            {
                $group: {
                    _id: '$product',
                    sales: { $sum: '$salestotal' },
                    expense: { $sum: '$expensetotal' },
                    quantity: { $sum: '$quantity' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $addFields: {
                    title: { $arrayElemAt: ['$product.title', 0] },
                    // price: { $arrayElemAt: ['$product.price', 0] },
                    // image: { $arrayElemAt: ['$product.image', 0] },
                    productNo: { $arrayElemAt: ['$product.productNo', 0] },
                    income: { $subtract: ['$sales', '$expense'] }
                }
            },
            {
                $project: {
                    product: 0
                }
            },
            { $sort: { income: -1 } }
        ]);

        return res.send(sales);
    } catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
});

router.get('/dashboard/income', async (req, res, next) => {
    try {
        // let { startOrdered, endOrdered } = req.query;

        const sales = await Order.aggregate([
            {
                $match: {
                    // dateCreated: {
                    //     $gte: moment(startOrdered)
                    //         .startOf('day')
                    //         .toDate(),
                    //     $lte: moment(endOrdered)
                    //         .endOf('day')
                    //         .toDate()
                    // },
                    isActive: true
                }
            },
            { $unwind: '$orders' },
            {
                $lookup: {
                    from: 'stocks',
                    localField: 'orders.stock',
                    foreignField: '_id',
                    as: 'stocks'
                }
            },
            {
                $addFields: {
                    // product: '$orders.product',
                    quantity: '$orders.quantity',
                    salestotal: '$orders.total',
                    cost: { $arrayElemAt: ['$stocks.cost', 0] }
                }
            },
            {
                $project: {
                    // product: 1,
                    // quantity: 1,
                    dateCreated: 1,
                    salestotal: 1,
                    expensetotal: { $multiply: ['$cost', '$quantity'] },
                    incometotal: { $subtract: ['$salestotal', { $multiply: ['$cost', '$quantity'] }] }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%m', date: '$dateCreated' } },
                    sales: { $sum: '$salestotal' },
                    expense: { $sum: '$expensetotal' },
                    income: { $sum: '$incometotal' }
                    // averageQuantity: { $avg: '$quantity' },
                    // count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
            // {
            //     $group: {
            //         _id: '$product',
            //         sales: { $sum: '$salestotal' },
            //         expense: { $sum: '$expensetotal' },
            //         quantity: { $sum: '$quantity' }
            //     }
            // },
            // {
            //     $lookup: {
            //         from: 'products',
            //         localField: '_id',
            //         foreignField: '_id',
            //         as: 'product'
            //     }
            // },
            // {
            //     $addFields: {
            //         title: { $arrayElemAt: ['$product.title', 0] },
            //         // price: { $arrayElemAt: ['$product.price', 0] },
            //         // image: { $arrayElemAt: ['$product.image', 0] },
            //         productNo: { $arrayElemAt: ['$product.productNo', 0] },
            //         income: { $subtract: ['$sales', '$expense'] }
            //     }
            // },
            // {
            //     $project: {
            //         product: 0
            //     }
            // },
            // { $sort: { income: -1 } }
        ]);

        return res.send(sales);
    } catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
});

router.get('/dashboard/sales', async (req, res, next) => {
    try {
        const order = await Order.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: '%m', date: '$dateCreated' } },
                    totalSaleAmount: { $sum: '$subtotal' },
                    totalSaleAmount2: { $sum: '$total' } //{ $multiply: ['$price', '$quantity'] }
                    // averageQuantity: { $avg: '$quantity' },
                    // count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return res.send(order);
    } catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
});

router.get('/dashboard/productsold', async (req, res, next) => {
    try {
        const order = await Order.aggregate([
            {
                $unwind: '$orders'
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%m', date: '$dateCreated' } },
                    productSold: { $sum: '$orders.quantity' }
                }
            }

            // { $sort: { _id: 1 } }
        ]);

        return res.send(order);
    } catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
});

router.post('/checkout', async (req, res, next) => {
    const { orders } = req.body;

    try {
        const orderNo = await incrementCounter('Order');

        // const charge = await stripe.charges.create({
        //     amount: Math.round((orders.total * 100).toFixed(2)),
        //     currency: 'php',
        //     description: `${orderNo} - ${customerName} purchase`,
        //     source: stripeToken
        // });

        // const {
        //     id: paymentId = '',
        //     receipt_url = '',
        //     status = '',
        //     source: { brand: card = '', last4 = '' }
        // } = charge;

        // const payment = {
        //     paymentId,
        //     receipt_url,
        //     status,
        //     card,
        //     last4
        // };

        order = new Order({
            orderNo,
            ...orders,
            // ...payment,

            dateCreated: new Date(),
            dateUpdated: new Date(),
            isActive: true
        });

        order = await order.save();

        // const asyncFunctions = await orders.orders.map(async (i, index) => {
        //     const { stock, quantity } = i;
        //     return await Stock.findOneAndUpdate({ _id: stock }, { $inc: { remainingStock: -quantity }, dateUpdated: new Date() }, { useFindAndModify: false, new: true });
        // });

        // const stocks = await Promise.all(asyncFunctions);

        res.send(order);
    } catch (e) {
        console.log(e.message);
        res.status(500).send(e.message);
    }
});

// router.post('/checkout', async (req, res, next) => {
//     const { customerName, stripeToken, orders } = req.body;

//     try {
//         const orderNo = await incrementCounter('Order');

//         const charge = await stripe.charges.create({
//             amount: Math.round((orders.total * 100).toFixed(2)),
//             currency: 'php',
//             description: `${orderNo} - ${customerName} purchase`,
//             source: stripeToken
//         });

//         const {
//             id: paymentId = '',
//             receipt_url = '',
//             status = '',
//             source: { brand: card = '', last4 = '' }
//         } = charge;

//         const payment = {
//             paymentId,
//             receipt_url,
//             status,
//             card,
//             last4
//         };

//         order = new Order({
//             orderNo,
//             ...orders,
//             ...payment,

//             dateCreated: new Date(),
//             dateUpdated: new Date(),
//             isActive: true
//         });

//         order = await order.save();

//         const asyncFunctions = await orders.orders.map(async (i, index) => {
//             const { stock, quantity } = i;
//             return await Stock.findOneAndUpdate({ _id: stock }, { $inc: { remainingStock: -quantity }, dateUpdated: new Date() }, { useFindAndModify: false, new: true });
//         });

//         const stocks = await Promise.all(asyncFunctions);

//         res.send(stocks);
//     } catch (e) {
//         console.log(e.message);
//         res.status(500).send(e.message);
//     }
// });

router.put('/:id', async (req, res, next) => {
    try {
        const { data, logs } = req.body;

        const order = await Order.findOneAndUpdate({ _id: req.params.id }, { ...data, dateUpdated: new Date() }, { useFindAndModify: false, new: true });
        if (!order) return res.status(404).send('Order not found.');

        await User.findOneAndUpdate({ _id: logs.id }, { $push: { logs: { ...logs } } }, { useFindAndModify: false, new: true });

        res.send(order);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.put('/:id/feedback', async (req, res, next) => {
    try {
        let { id: orderId } = req.params;
        let { feedbacks } = req.body;

        const order = await Order.findOneAndUpdate({ _id: orderId }, { $set: { 'orders.$[].hasRating': true } }, { multi: true, useFindAndModify: false, new: true });

        feedbacks = feedbacks.map(
            i =>
                new Rating({
                    ...i,
                    order: orderId,

                    dateCreated: new Date(),
                    dateUpdated: new Date(),
                    isActive: true
                })
        );

        feedbacks = await Rating.insertMany(feedbacks);
        return res.send(feedbacks);
    } catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
});

module.exports = {
    router,
    Order
};
