'use strict';

const request = require('request');
const cheerio = require('cheerio');
const intentInfo = require('./intentInfo');
const getEventOfMonth = require('./eventOfMonth');

const monthNames = intentInfo.monthNames;
const citiesCode = intentInfo.citiesCode;

var newline = '\r\n\r\n';
var topFiveMoreInfo = " You can tell me a number for more information. For example open number one.";
var introduce = `Hello Everybody! I am Thaiterest. This is application for travel in Thailand, it can help you to find overall place in Thailand. Just to says "Where should i go in Bangkok" or "attraction in Krabi" in this application it will be show detail of attraction in Thailand with link of google map, You can say "Tell me upcoming events in June" or "Events in August" for all event in Thailand.`;




var stringConstructor = "test".constructor;
var arrayConstructor = [].constructor;
var objectConstructor = {}.constructor;

function checkObjectType(object) {
    if (object === null) {
        return "null";
    } else if (object === undefined) {
        return "undefined";
    } else if (object.constructor === stringConstructor) {
        return "String";
    } else if (object.constructor === arrayConstructor) {
        return "Array";
    } else if (object.constructor === objectConstructor) {
        return "Object";
    } else {
        return "don't know";
    }
}

function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
            responseCard: {
                "version": 1,
                "contentType": "application/vnd.amazonaws.card.generic",
                "genericAttachments": [{
                    "title": "card-title",
                    "subTitle": "card-sub-title",
                    "imageUrl": "https://cdn2.iconfinder.com/data/icons/location-map-simplicity/512/travel_agency-512.png",
                    "attachmentLinkUrl": "https://cdn2.iconfinder.com",
                    "buttons": [{
                        "text": "button-text",
                        "value": "Bangkok"
                    }]
                }]
            }
        }

    };

}

function closeWithResponseCard(sessionAttributes, fulfillmentState, message, responseCard) {
    return {
        // sessionAttributes,
        dialogAction: {
            type: 'ElicitIntent',
            // fulfillmentState,
            message,
            responseCard,
        },
    };
}

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            intentName,
            slots,
            slotToElicit,
            message,
        },
    };
}

function elicitSlotWithCards(sessionAttributes, intentName, slots, slotToElicit, message, responseCard) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            message,
            intentName,
            slots,
            slotToElicit,
            responseCard,
        },
    };
}

function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}

function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots,
        },
    };
}


function buildValidationResult(isValid, violatedSlot, messageContent) {
    if (messageContent == null) {
        return {
            isValid,
            violatedSlot,
        };
    }
    return {
        isValid,
        violatedSlot,
        message: { contentType: 'PlainText', content: messageContent },
    };
}
// --------------- Events -----------------------

function validateCity(city) {

    if (city) {
        for (var i = citiesCode.length - 1; i >= 0; i--) {
            // console.log(citiesCode[i].name.toUpperCase()+" === " + city.toUpperCase());
            if (citiesCode[i].name.toUpperCase() == city.toUpperCase()) {
                console.log("Pass city validation : " + city);
                return buildValidationResult(true, null, "");
            }
        }
        return buildValidationResult(false, 'city', `We do not know ${city}. Could you tell a different city name?  Our most popular cities are Bangkok ,Krabi and Pattaya`);
    }
    return buildValidationResult(true, null, "");

}

function validateAttraction(attraction) {
    if (attraction) {
        return buildValidationResult(true, 'attraction', `https://www.google.com/maps/dir/Current+Location/${attraction}`);
    }
    return buildValidationResult(false, 'attraction', `We do not known ${attraction}`);
}



function attrcationContent(intentRequest, callback) {
    const city = intentRequest.currentIntent.slots.city;
    const attraction = intentRequest.currentIntent.slots.attraction;
    const source = intentRequest.invocationSource;
    const transcriptObj = intentRequest.inputTranscript;
    const sessionAttr = intentRequest.sessionAttributes;


    if (source === 'DialogCodeHook') {
        // Perform basic validation on the supplied input slots.  Use the elicitSlot dialog action to re-prompt for the first violation detected.
        const slots = intentRequest.currentIntent.slots;
        const validationResult = validateCity(city);
        console.log("validationResult : " + validationResult)
        if (!validationResult.isValid) {
            console.log("response elicitSlotWithCards");
            slots[`${validationResult.violatedSlot}`] = null;
            callback(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
            return;
        }
        if (city && !attraction) {
            getCityResponseCard(intentRequest, slots, validationResult, callback);
            // callback(elicitSlotWithCards(intentRequest.sessionAttributes,validationResult.message,responseCard));
            return;
        }

        if (attraction && sessionAttr) {
            // sessionAttr.mapUrl = null;
            const attractions = JSON.parse(sessionAttr.attractionList || '{}');
            if (attraction) {
                callback(close(null, 'Fulfilled', { contentType: 'PlainText', content: attractions[attraction].url }));
                // callback(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, 'attraction', attractions[attraction].url));
                return;
            }

        }

        // Pass the price of the flowers back through session attributes to be used in various prompts defined on the bot model.

        const outputSessionAttributes = intentRequest.sessionAttributes || {};
        callback(delegate(outputSessionAttributes, intentRequest.currentIntent.slots));
        return;
    }
    callback(close(intentRequest.sessionAttributes, 'Fulfilled', { contentType: 'PlainText', content: `Goodbye Have a nice trip.` }));
}





function getCityResponseCard(intentRequest, slots, validationResult, callback) {
    const city = intentRequest.currentIntent.slots.city;
    var cityCode = 0;
    for (var i = citiesCode.length - 1; i >= 0; i--) {
        if (citiesCode[i].name.toUpperCase() == city.toUpperCase()) {
            cityCode = citiesCode[i].cityCode;
        }
    }
    var attractionList = [];
    let url = `https://www.tourismthailand.org/Attraction/Search?lifestyle_id=&cat_id=&subcat_id=&view=${cityCode}&keyword=`;
    if (cityCode == 0) {
        url = `https://www.tourismthailand.org/Attraction/Search?lifestyle_id=&cat_id=&subcat_id=&view=keyword=${city}`;
    }
    console.log("url : " + url);
    request(url, (err, response, body) => {

        if (!err && response.statusCode === 200) {
            // console.log(body);
            let $ = cheerio.load(body);

            var cards = [];
            let attractionsVoice = "";
            let attractionsContent = "";
            $('.list02 > .list-border').each(function(i, elem) {
                if (i >= 10) {
                    return false;
                }


                let href = $('.text > .text-primary', this).find('a').attr('href');
                let name = $('.text > .text-primary', this).text();
                let imgUrl = $('.thumb > .overview-photo', this).find('img').attr('src');

                var imgSrc = $('.thumb > .overview-photo', this).find('a').attr('href');
                cards[i] = {
                    "title": name.replace('|', ' '),
                    "subTitle": city,
                    "imageUrl": imgSrc,
                    "attachmentLinkUrl": href,
                    "buttons": [{
                            "text": "Map",
                            "value": i
                        }]
                        //"https://www.google.com/maps/dir/Current+Location/"+name.replace(/\s+/g, '+')
                };
                var attraction = { "text": name, "url": "https://www.google.com/maps/dir/Current+Location/" + name.replace(/\s+/g, '+') };
                attractionList[i] = attraction;
                attractionsVoice += " Number " + (i + 1) + " " + name + newline;
                attractionsContent += (i + 1) + " " + name + newline;

            });

            if (attractionList.length > 0) {
                attractionsVoice += topFiveMoreInfo;
                var responseCard = {
                    "version": 1,
                    "contentType": "application/vnd.amazonaws.card.generic",
                    "genericAttachments": cards

                };
                console.log("Return Card : ");
                // callback(closeWithResponseCard("","",{ contentType: 'PlainText', content: 'You can press Map button for direction.' },responseCard));
                callback(elicitSlotWithCards({ 'attractionList': JSON.stringify(attractionList) }, intentRequest.currentIntent.name, {
                    "city": city,
                    "attraction": ""
                }, 'attraction', { contentType: 'PlainText', content: 'Press map button for direction' }, responseCard));
            } else {
                return null;
            }

        } else {
            return null;
        }
    });
}


function dispatch(intentRequest, callback) {
    console.log('request : ' + intentRequest.currentIntent.name);
    // console.log(`request received for userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.intentName}`);

    const intentName = intentRequest.currentIntent.name;
    const sessionAttributes = intentRequest.sessionAttributes;
    if (intentName === 'GetAttraction') {

        attrcationContent(intentRequest, callback);

    } else if (intentName === 'ThaiterestHelp') {
        const slots = intentRequest.currentIntent.slots;
        var topic = "";
        var responseTxt = "";
        if (slots) {
            if (slots.helpTopic.toLowerCase() === 'city list') {
                topic = "Cities in Thailand";
                for (var i = 0; i < citiesCode.length; i++) {
                    responseTxt += citiesCode[i].name + newline;
                    if (i == 40) {
                        break;
                    }
                }

            } else {
                topic = "Hand Book"
                responseTxt = introduce
            }
            callback(close(sessionAttributes, 'Fulfilled', { 'contentType': 'PlainText', 'content': topic + newline + responseTxt }));
        }


    } else if (intentName === 'getEventOfMonth') {

        getEventOfMonth(intentRequest, callback);
    } else {
        callback(close(sessionAttributes, 'Fulfilled', { 'contentType': 'PlainText', 'content': `Okay, you're interested in ${city}` }));
    }
}


module.exports.thaiterest = (event, context, callback) => {
  try {
    console.log("Handle Event : " + JSON.stringify(event));
    dispatch(event,
        (response) => {
            console.log("Response : " + JSON.stringify(response));
            callback(null, response);
        });
} catch (err) {
    callback(err);
}
  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};
