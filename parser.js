"use strict";
const fs = require('fs');
const http = require('http');
const _ = require('lodash');
const request = require('request');
const md5 = require('js-md5');

const regParse = /http:\/\/www\.amazon\.com\/(\w|\d|-)*\/dp\/[a-z|0-9]{10}\//gi;

const regPrice = /<span (id="priceblock_(ourprice|saleprice)*")* class="a-size-medium a-color-price">\$\d+\.\d{2}<\/span>/g;
const regTitle = /<span id="productTitle" class="a-size-large">.+<\/span>/g;
const regDesc = /<span class="a-list-item">[^<]*<\/span>/g;
const regImages = /http:\/\/ecx\.images-amazon\.com\/images\/I\/[a-z|0-9]{11}\.*\.jpg/gi;

function processCatalog(url) {

  return new Promise((resolve, reject) => {

    //product objects constructor
    function Product(url) {
      let self = this;
      this.url = url;
      this.hashedUrl = md5(url);
      this.body = function () {
        let fileBody = fs.readFileSync('./cached/cached_' + self.hashedUrl + '.html');
        return fileBody.toString();
      };
      this.productTitle = function () {
        let title = self.body().match(regTitle);
        if (title) {
          title.forEach((item, index) => {
            title[index] = item.slice(45, -7);
          });
          return title.toString();
        } else {
          return 'no title';
        }
      };
      this.productDescription = function () {
        var description = self.body().match(regDesc);
        if (description) {
          description.forEach((item, index) => {
            description[index] = item.slice(27, -7);
          });
          return description.toString().trim();
        } else {
          return 'no description';
        }
      };
      this.productImages = function () {
        let img = self.body().match(regImages);
        return _.sortedUniq(img);
      };
      this.productPrice = function () {
        let price = self.body().match(regPrice);
        if (price) {
          price.forEach((item, index) => {
            price[index] = item.slice(68, -7);
          });
          return '$' + price.toString();
        } else {
          return 'no price';
        }
      };
      return {
        title: this.productTitle(),
        description: this.productDescription(),
        price: this.productPrice(),
        images: this.productImages()
      }
    }

    //gets catalog page from Amazon
    function getCatalog() {
      return new Promise((resolve, reject) => {
        request(
          {
            method: 'GET',
            uri: url,
            headers: {
              'User-Agent': 'Webkit'
            }
          },
          function (error, response, page) {
            if (error) {
              reject(new Error('Page not found'));
              return;
            }
            resolve(page);
          });
      });
    }

    //parses page, caches files and returns an array of product URLs
    function parsePage(page) {
      var arrOfURLs = _.sortedUniq(page.match(regParse));
      arrOfURLs.forEach((item) => {
        let hash = md5(item);
        fs.open('./cached/cached_' + hash + '.html', "r+", function (err) {
          if (err) {
            request({
              method: 'GET',
              uri: item,
              headers: {
                'User-Agent': 'Webkit'
              }
            }).pipe(
              fs.createWriteStream('./cached/cached_' + hash + '.html')
            )
          } else {
            return;
          }
        })
      });
      return arrOfURLs;
    }

    //creates objects from URLs and returns an array of objects
    function processItems(arrOfURLs) {
      var arrItems = [];
      arrOfURLs.forEach((url) => {
        var p = new Product(url);
        arrItems.push(p);
      });
      return arrItems;
    }

    function writeToJSON(arrItems) {
      fs.writeFile('products.json', JSON.stringify(arrItems, null, 2), 'utf-8', function(err) {
        if (err) throw new Error('Cannot write file');
      });
      return arrItems;
    }

    getCatalog()
      .then(parsePage)
      .then(processItems)
      .then(writeToJSON)
      .then((arrItems) => {
        resolve(arrItems);
      })
      .catch(function () {
        throw new Error('Cannot process catalog');
      });
  })
}

module.exports = processCatalog;

