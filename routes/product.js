const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Double = require('@mongoosejs/double');
const multer = require('multer');
const sharp = require('sharp');
const uuid = require('uuid/v4');
// const { Counter, incrementCounter } = require('./counter');
const { Stock } = require('./stock');
const { Order } = require('./order');
const { User } = require('./user');

const upload = multer({
    storage: multer.diskStorage({
        destination: function(req, file, cb) {
            cb(null, 'public/uploads/products');
        },
        filename: function(req, file, cb) {
            const { filename } = req.query;
            cb(null, `${filename}.png`);
        }
    })
});

const Product = mongoose.model(
    'Product',
    new mongoose.Schema({
        productNo: {
            type: String,
            required: true
        },
        stockNo: {
            type: String
            // required: true
        },
        stock: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Stock'
        },
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
        price: {
            type: Double
            // required: true
        },
        image: {
            type: String
        },
        forBuild: {
            type: Boolean
        },
        partType: {
            type: String
        },
        bikePartType: {
            type: String
        },
        buildImage: {
            type: String
        },
        createdBy: {
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
        const { type, search } = req.query;

        // // get all
        // if (!type && !search) {
        //     const product = await Product.find({ isActive: true, stockNo: { $nin: [null, ''] } })
        //         .populate('stock', 'remainingStock')
        //         .select('title type price image');
        //     return res.send(product);
        // }

        // // get by type
        // let filter = { isActive: true, stockNo: { $nin: [null, ''] } };
        // if (type) filter.type = type;
        // if (search) filter.title = { $regex: search.trim(), $options: '-i' };

        // const product = await Product.find(filter).populate('stock', 'remainingStock');
        // return res.send(product);

        let filter = { isActive: true, stockNo: { $nin: [null, ''] } };
        if (type) filter.type = type;
        if (search) filter.title = { $regex: search.trim(), $options: '-i' };

        const product = await Product.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'ratings',
                    localField: '_id',
                    foreignField: 'product',
                    as: 'ratings'
                }
            },
            {
                $lookup: {
                    from: 'stocks',
                    localField: 'stock',
                    foreignField: '_id',
                    as: 'stocks'
                }
            },
            {
                $addFields: {
                    stock: { $arrayElemAt: ['$stocks', 0] }
                }
            },
            { $match: { 'stock.remainingStock': { $gt: 0 } } },
            {
                $project: {
                    title: 1,
                    type: 1,
                    price: 1,
                    image: 1,
                    'stock._id': 1,
                    'stock.remainingStock': 1,
                    ratings: 1
                }
            }
        ]);

        res.send(avgRating(product));
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.get('/build', async (req, res, next) => {
    try {
        const { bikePartType = 'All' } = req.query;

        let product = await Product.find({ bikePartType, forBuild: true, stockNo: { $nin: [null, ''] }, isActive: true }).populate('stock', 'remainingStock');
        product = product.filter(i => i.stock.remainingStock > 0);

        return res.send(product);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.get('/admin', async (req, res, next) => {
    try {
        const product = await Product.find({ isActive: true })
            .populate('stock', 'remainingStock')
            .populate('createdBy', 'firstname lastname');
        return res.send(product);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.get('/new', async (req, res, next) => {
    try {
        const { limit = 3 } = req.query;

        const product = await Product.find({ isActive: true, stockNo: { $nin: [null, ''] } })
            .select('title price image dateCreated')
            .sort({ dateCreated: 'desc' })
            .limit(Number(limit));

        res.send(product);
    } catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
});

router.get('/bestseller', async (req, res, next) => {
    try {
        const order = await Order.aggregate([
            { $match: { isActive: true } },
            { $unwind: '$orders' },
            {
                $group: {
                    _id: '$orders.product',
                    sales: { $sum: '$orders.total' }
                }
            },
            { $limit: 3 },
            { $sort: { sales: -1 } },
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
                    price: { $arrayElemAt: ['$product.price', 0] },
                    image: { $arrayElemAt: ['$product.image', 0] }
                }
            },
            {
                $project: {
                    product: 0
                }
            }
        ]);

        return res.send(order);
    } catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        // const product = await Product.findById(req.params.id).populate('stock', 'remainingStock');

        let { id } = req.params;
        id = mongoose.Types.ObjectId(id);

        const product = await Product.aggregate([
            {
                $match: { _id: { $in: [id] } }
            },
            {
                $lookup: {
                    from: 'stocks',
                    localField: 'stock',
                    foreignField: '_id',
                    as: 'stocks'
                }
            },
            {
                $addFields: {
                    stock: { $arrayElemAt: ['$stocks', 0] }
                }
            },
            {
                $lookup: {
                    from: 'ratings',
                    localField: '_id',
                    foreignField: 'product',
                    as: 'ratings'
                }
            },
            {
                $project: {
                    stocks: 0
                }
            }
        ]);

        if (!product.length) return res.status(404).send('Product not found.');

        res.send(avgRating2(product[0]));
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { data, logs } = req.body;

        const productNo = await incrementCounter('Product');
        let product;

        if (data.forBuild) {
            product = new Product({
                ...data,
                productNo,
                image: `uploads/products/${productNo}.png`,
                buildImage: `uploads/products/buildimage_${productNo}.png`,

                dateCreated: new Date(),
                dateUpdated: new Date(),
                isActive: true
            });
        } else {
            product = new Product({
                ...data,
                productNo,
                image: `uploads/products/${productNo}.png`,

                dateCreated: new Date(),
                dateUpdated: new Date(),
                isActive: true
            });
        }

        product = await product.save();
        product = await Product.findById(product._id)
            .populate('stock', 'remainingStock')
            .populate('createdBy', 'firstname lastname');

        logs.activity += productNo;
        await User.findOneAndUpdate({ _id: logs.id }, { $push: { logs: { ...logs } } }, { useFindAndModify: false, new: true });

        res.send(product);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.post('/upload/image', upload.single('image'), async (req, res, next) => {
    try {
        const { resize } = req.query;

        if (resize) {
            const image = req.file;
            const filepath = image.path;
            const filename = image.filename;

            await sharp(filepath)
                .resize({ width: 350, height: 350 })
                .png()
                .toBuffer()
                .then(buffer => fs.writeFile(`public/uploads/products/${filename}`, buffer, e => {}));
        }

        res.send('done');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.put('/', async (req, res, next) => {
    try {
        const product = await Product.updateMany({}, { $set: { createdBy: '5e47870320d3ea0017b622d8' } });

        res.send(product);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const { data, logs } = req.body;

        const product = await Product.findOneAndUpdate({ _id: req.params.id }, { ...data }, { useFindAndModify: false, new: true }).populate('stock', 'remainingStock');

        if (product.stock) {
            if (product.stock._id) {
                const stock = await Stock.findOneAndUpdate({ _id: product.stock._id }, { status: 'shop' }, { useFindAndModify: false, new: true });
            }
        }

        if (!product) return res.status(404).send('Product not found.');

        await User.findOneAndUpdate({ _id: logs.id }, { $push: { logs: { ...logs } } }, { useFindAndModify: false, new: true });

        res.send(product);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.delete('/:id/image/:filename', (req, res, next) => {
    const { id, filename } = req.params;
    const filepath = `./public/uploads/products/${filename}`;

    fs.unlink(filepath, async err => {
        try {
            const product = await Product.findOneAndUpdate({ _id: id }, { $pull: { images: { filename } } }, { useFindAndModify: false, new: true });

            if (!product) return res.status(404).send('Product not found.');

            res.send(product);
        } catch (e) {
            res.status(500).send(e.message);
        }
    });
});

function avgRating(products) {
    return products.map(p => {
        const ratings = p.ratings;
        const sum = ratings.reduce((accumulator, currentValue) => accumulator + currentValue.rating, 0);
        const avg = sum ? sum / ratings.length : 0;

        p.ratings = avg;

        return p;
    });
}

function avgRating2(product) {
    const ratings = product.ratings;
    const sum = ratings.reduce((accumulator, currentValue) => accumulator + currentValue.rating, 0);
    const avg = sum ? sum / ratings.length : 0;

    product.ratings = avg;

    return product;
}

module.exports = {
    router
    // decreaseStock
};
