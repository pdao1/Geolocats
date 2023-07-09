'use strict'

const express = require('express');
const mongoose = require('mongoose');
const LostCat = require('./models/LostCat');
const LostCatMHS = require('./models/LostCatMHS');
const LostCatSubmitted = require('./models/LostCatSubmitted');
const path = require('path');
const async = require('async');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = 3000;
const HOST = '0.0.0.0';
const fs = require('fs')
// const bodyParser = require('body-parser');
const mongoPass = 'phung123'
const { MongoClient, ServerApiVersion } = require('mongodb');
const AWS = require('aws-sdk');
// const gMapKey = process.env['gMapKey']


const s3 = new AWS.S3({
	accessKeyId: 'AKIAVEB2TV7YIHOG2NRF',
	secretAccessKey: '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',
});

const namesArray = []

const uploadImageFromUrlToS3 = async (imageUrl, bucketName, fileName) => {
	try {
		const response = await axios.get(imageUrl, {
			responseType: 'arraybuffer'
		});
		const buffer = Buffer.from(response.data, 'binary');

		const params = {
			Bucket: bucketName,
			Key: fileName,
			Body: buffer,
			ACL: 'public-read',
			ContentType: response.headers['content-type']
		};

		const data = await s3.upload(params).promise();
		console.log(`Successfully uploaded image to S3: ${data.Location}`);
	} catch (error) {
		console.error(`Failed to upload image to S3: ${error}`);
	}
};

// Routes

// Main page
app.get('/', (req, res) => {
	res.sendFile(path.resolve('./public/index.html'))
})
// Thank you / confirmation page
app.get('/confirmation', (req, res) => {
	res.sendFile(path.resolve('./public/confirmation.html'))
})
// Admin portal
app.get('/map', (req, res) => {
	res.sendFile(path.resolve('./public/map.html'))
})

app.get('/api/collection', async (req, res) => {
	let data = await LostCat.find({}, { _id: 1, name: 1, location: 1, s3imgUrl: 1 })
	res.send(data)
})

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`);
});

// mongoose.connect(`mongodb+srv://phungdao:phung123@geolocats.jcedrpx.mongodb.net/LostCat?retryWrites=true&w=majority`);

async function createNewLostCat(newLostCat) {
	try {
		const result = await LostCat.create(newLostCat);
		console.log('New document created:', result);
	} catch (error) {
		console.error(error);
	}
}

async function updateCatDetails(item, update) {
	try {
		const result = await LostCat.findByIdAndUpdate(item, update, { new: false });
		console.log('Document updated:', result);
	} catch (error) {
		console.error(error);
	}
}

async function findDocumentsWithNullField(fieldName) {
	fieldName = 'catColor'
	var resultArr = []
	try {
		const query = { [fieldName]: null };
		const result = await LostCat.find(query).select('_id')
		console.log('Documents found:', result);
		for (key in result) {
			resultArr.push(result[key]["_id"])
		}
		// queue begins
		const q = async.queue((item, callback) => {
			console.log(`working on ${item}`);
			let lostLocation, catColor;
			// do something
			url = `https://hawaiianhumane.org/lost-pets-details/?animalID=${item}`
			console.log(url)
			axios.get(url)
				.then((response) => {
					const html = response.data;
					const $ = cheerio.load(html);
					$('article').each(async function() {
						lostLocation = $('span.location-lost-value.value.c-1-2').text()
						catColorStr = $('span.color-value.value.c-1-2').text()
						sub = ``;
						wsRegex = /\s/g
						catColor = catColorStr.replace(wsRegex, sub);
					})
					console.log(lostLocation, catColor)
					update = {
						lostLocation: lostLocation,
						catColor: catColor,
					};
					updateCatDetails(item, update)
					console.log(result)
				}).catch((err) => {
					console.error(err);
				})
			setTimeout(callback, 15000);
		}, 1);
		// do something ends

		resultArr.forEach((item) => {
			q.push(item);
		});

		q.drain(() => {
			console.log('All items have been processed');
		});
		// queue ends

	} catch (error) {
		console.error(error);
	}
}


async function go() {
	mongoose.connect(`mongodb+srv://phungdao:phung123@geolocats.jcedrpx.mongodb.net/LostCat?`, { useNewUrlParser: true, useUnifiedTopology: true });
	update = {
		lat: 21.310567173725662,
		lng: -157.85772272777268
	};
	let fieldName = 'location'
	const query = { [fieldName]: 'Honolulu' };
	const result = await LostCat.find(query).select('_id')
	// updateCatDetails(item, update)
	console.log(result)
}


// findDocumentsWithNullField(fieldName)
// 1.5 days
setInterval(findDocumentsWithNullField, 129600000)
// setTimeout(findDocumentsWithNullField, 4000)


async function checkPetIdsAddNewCat() {

	var url = 'https://hawaiianhumane.org/lost-pets/?speciesID=2'
	axios.get(url)
		.then((response) => {
			const html = response.data;
			const $ = cheerio.load(html);
			$('article').each(async function() {
				let id = $(this).data('id');
				let name = $(this).data('name');
				let age = $(this).data('agetext');
				let gender = $(this).data('gender');
				let breed = $(this).data('primarybreed');
				let tempLocation = $(this).children('.animal-location.card-footer').children('span.small.text-truncate').text()
				let tempImgUrl = $(this).children().data('bg');
				let regex = /(?:pet)/g;
				let subst = `pets`;
				let ogUrl = url.replace(regex, subst);
				let regex2 = /url\('/g
				let regex3 = /'\)/g
				let tempImgUrl2 = tempImgUrl.replace(regex2, '')
				let imgUrl = tempImgUrl2.replace(regex3, '')
				let locationRegex = /Location: /guis;
				let location = tempLocation.replace(locationRegex, '')
				let s3imgUrl = `https://phung-stuff.s3.amazonaws.com/${id}`
				// END S3 image upload
				let catID = await LostCat.findById(id).exec()
				if (catID == null) {
					console.log(id)
					// upload s3 image
					imageUrl = imgUrl;
					bucketName = 'phung-stuff';
					fileName = `${id}`;
					uploadImageFromUrlToS3(imageUrl, bucketName, fileName);
					// create new lost cat object
					let newLostCat = {
						_id: id,
						name: name,
						age: age,
						gender: gender,
						breed: breed,
						ogUrl: ogUrl,
						imgUrl: imgUrl,
						location: location,
						s3imgUrl: s3imgUrl,
					};
					await createNewLostCat(newLostCat)
				}
			})
		})
		.catch((err) => {
			console.error(err);
		})
}

// UPLOAD PETANGO TO S3 THEN UPDATE s3 FIELD.
async function test(){
	await mongoose.connect(`mongodb+srv://phungdao:phung123@geolocats.jcedrpx.mongodb.net/LostCatMHS?retryWrites=true&w=majority`)
	console.log('Connected to MongoDB');
	let catMHS = await LostCatMHS.find({}, { _id: 1, imgUrl: 1 })
	catMHS.forEach(async function(cat) {
	let id = cat._id;
	cat.s3imgUrl = `https://phung-stuff.s3.amazonaws.com/maui/${id}`
	cat.save()
	// let bucketName = 'phung-stuff/maui';
	// let fileName = `${id}`;
	// uploadImageFromUrlToS3(imageUrl, bucketName, fileName);
	// catMHS.s3imgUrl = `https://phung-stuff.s3.amazonaws.com/maui/${id}`
	})
}

test()
// check once per day
setInterval(checkPetIdsAddNewCat, 86400000)
// setTimeout(checkPetIdsAddNewCat, 4000)

// filter and remove whitespace
async function removeWhiteSpace() {
	const catColors = await LostCat.find({}, { _id: 1, catColor: 1 })
	console.log(catColors)
	catColors.forEach((item) => {
		console.log(item.catColor)
		colorId = item._id;
		colorItem = item.catColor;
		sub = ``;
		wsRegex = /\s/g
		updatedItem = colorItem.replace(wsRegex, sub);
		console.log(updatedItem)
		update = {
			catColor: updatedItem,
		};
		// 	updateCatDetails(colorId, update)
	})
	// 					
}

// (async function(){
// 	let mauiCatId = await LostCatMHS.findById(id).exec()
// 	// upload s3 image
// 	// imageUrl = imgUrl;
// 	// bucketName = 'phung-stuff';
// 	// fileName = `${id}`;
// 	// uploadImageFromUrlToS3(imageUrl, bucketName, fileName);
// console.log(mauiCatId)
// })