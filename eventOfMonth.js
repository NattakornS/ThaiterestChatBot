var getEventOfMonth = function getEventOfMonth(intentRequest, callback) {
    var monthgetevent = intentRequest.currentIntent.slots.getEvent;
    var date = new Date();
    var month;
    var outputPrint = [];
    var eventofmonthList = [];
    const URL_getEventOfMonth = 'https://na.tourismthailand.org/home';
    let firstP = new Promise((resolve, reject) => {
        request(URL_getEventOfMonth, (err, response, body) => {
            if (!err && response.statusCode === 200) {
                let $ = cheerio.load(body);
                if (monthgetevent === 'This month' || monthgetevent === 'this month') {
                    month = monthNames[date.getMonth()];
                } else {
                    month = monthgetevent;
                }
                var cards_event = [];
                let eventOfmonth = $('.yearfest-info > .yearfest-thismonth >.thismonth', `#monthtab_${month}`).eq(1).text();
                $('.yearfest-info > .yearfest-thismonth', `#monthtab_${month}`).children().each(function(i, elem) {
                    let title_eventofmonth = $('.title', this).text();
                    let Venue_eventofmonth = $('.text', this).eq(0).text();
                    let Period_eventofmonth = $('.text', this).eq(1).text();
                    let url_eventofmonth = $(this).find('a').attr('href');
                    let url_image = " ";
                    let detailEventOfMonth = { 'title': title_eventofmonth, 'subTitle': Venue_eventofmonth + " , " + Period_eventofmonth, 'imageUrl': url_image, 'attachmentLinkUrl': url_eventofmonth, "buttons": null };
                    eventofmonthList[i] = detailEventOfMonth;
                });
                resolve(eventofmonthList);
            }
        });
    })
    firstP.then((successMessage) => {
        console.log("GetURL");
            var array = [];
            var cards_event = [];
            outputPrint = successMessage;
            if (successMessage.length === 0) {
                callback(close(null, 'Fulfilled', { 'contentType': 'PlainText', 'content': "No event in " + monthgetevent }));
                return;
            }
            Promise.all(successMessage.map(function(detailEventOfMonth) {
                return new Promise((resolve, reject) => {

                    request(detailEventOfMonth.attachmentLinkUrl, (err, response, body) => {
                        // request({uri: successMessage[j].URL}, (err, response, body) => { 
                        let urlphoto_event;

                        if (!err && response.statusCode === 200) {
                            let $ = cheerio.load(body);
                            urlphoto_event = $('.overview-photo').find('a').attr('href').toString();

                        }
                        detailEventOfMonth.imageUrl = urlphoto_event;
                        console.log("Finish IMGURL");
                        resolve(detailEventOfMonth);
                    });
                });
            })).then((result) => {
                    console.log("End for Display ")

                    console.log("function callback  closeWithResponseCard ")
                    callback(closeWithResponseCard({ 'outputPrint': JSON.stringify(result) }, 'Fulfilled', { 'contentType': 'PlainText', 'content': "Events in " + monthgetevent }, {
                        "version": 1,
                        "contentType": "application/vnd.amazonaws.card.generic",
                        "genericAttachments": result
                    }));
                }
            );
    });
}
modules.export = getEventOfMonth;