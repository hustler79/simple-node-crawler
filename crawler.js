'use strict';

const request = require('request-promise-native');
const cheerio = require('cheerio');
const fs = require('fs');

const maxRequest = 20;
const secureSleepTime = 120000; // 2min
let requestCounter = 0;

const searchPhrase = "solarium";
const startUrl = "https://panoramafirm.pl/"+ searchPhrase;

(function makeRequest(url, pause = false) {
    if (pause === true) {
        requestCounter = 0;
    } else {
        requestCounter++;
    }

    request({
        method: 'GET',
        uri: url,
        resolveWithFullResponse: true
    }).then(function (response) {
        if (response.statusCode === 200) {
            const nextUrl = processBody(response.body);

            if (nextUrl != null) {
                console.log('Next site to parse: ', nextUrl);

                if (maxRequest === requestCounter) {
                    console.log('Sleep for: ', secureSleepTime, 'ms');
                    setTimeout(makeRequest, secureSleepTime, nextUrl, true);
                } else {
                    setTimeout(makeRequest, 5000, nextUrl);
                }

            } else {
                console.log('No sites to parse.');
            }

        } else {
            console.log('Other status: ', response.statusCode);
            process.exit(1); // exit with failure code
        }
    }).catch(function (error) {
        console.log('Error: ', error);
    });
})(startUrl);

function processBody(body) {
    const $ = cheerio.load(body, {
        normalizeWhitespace: true
    });

    const nextUrl = $('head').find('link[rel=next]').attr('href');
    const dataArray = [];

    $('#serpContent ul li.business-card').each(function (index, element) {

        const companyName = $(element).find('.business-card-title').text();
        const emailElement = $(element).find('.business-card-bottom-bar li').eq(2);
        const emailString = $(emailElement).find('a').attr('href');
        const obj = {
            key: normalizeString(companyName),
            value: getEmail(emailString)
        };
        dataArray.push(obj);

    });

    writeToFile(dataArray);
    return nextUrl;
};

function normalizeString(rawString) {
    return rawString.trim()
        .replace(/(\r\n|\n|\r)/gm,"")
        .replace(/\s\s+/g, ' ')
        .replace(/"/g, "'");
}

function getEmail(hrefText) {
    const email = /^mailto:(.*)$/.exec(hrefText);
    if (email[1] !== "") {
        return email[1];
    }
    return 'Empty email address';
}

function writeToFile(dataObj) {
    for (let i = 0; i < dataObj.length; i++) {
        fs.appendFileSync('./result_data.csv', `"${dataObj[i].key}","${dataObj[i].value}"\n`);
    }
}
