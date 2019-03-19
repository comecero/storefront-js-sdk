let Products = function(config, storage, sendAsync) {
  this.get = function(productID) {
    return new Promise(function(resolve, reject) {
      if (storage.isTest() && !productID.match(/\.test/)) productID += '.test';
      let currency = storage.get('currency');
      let cacheKey = 'product:' + productID + ':' + currency;
      let product = storage.getCache(cacheKey);

      if (product) {
        resolve(product);
        return;
      }

      let url = 'https://' + config['appHost'] + '/api/v1/products/' + productID + '?formatted=true';
      if (currency) url += '&currency=' + currency;
      sendAsync.send( url, { method: 'GET' } ).then(
        function(product) {
          if (!currency && product.currency) {
            storage.set('currency', product.currency);
            cacheKey = 'product:' + productID + ':' + product.currency;
          }
          storage.setCache(cacheKey, product);
          resolve(product);
        },
        function(error) {
          reject(error);
        }
      );
    });
  };
};
