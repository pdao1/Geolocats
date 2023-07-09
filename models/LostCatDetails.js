const mongoose = require('mongoose')

const lostCatDetailsSchema = new mongoose.Schema({
	_id: Number,
	name: { type: String, required: false },
	breed: { type: String, required: false },
	age: { type: String, required: false },
	gender: { type: String, required: false },
	ogUrl: { type: String, required: false },
	imgUrl: { type: String, required: false },
	location: { type: String, required: false },
	s3imgUrl: { type: String, required: false },
	lostLocation: { type: String, required: false },
	catColor: { type: String, required: false },
}, { timestamps: true, collection: 'lost_cat_details' });

module.exports = mongoose.model('LostCatDetails', lostCatDetailsSchema);