const mongoose = require('mongoose')

const lostCatSubmitted = new mongoose.Schema({
	name: { type: String, required: false },
	date: { type: String, required: false },
	age: { type: String, required: false },
	contact: { type: String, required: false },
	gender: { type: String, required: false },
	imgUrl: { type: String, required: false },
	location: { type: String, required: false },
	lostLocation: { type: String, required: false },
	description: { type: String, required: false },
	catColor: { type: String, required: false },
}, { timestamps: true, collection: 'lost_cat_submitted' });

module.exports = mongoose.model('LostCatSubmitted', lostCatSubmitted);