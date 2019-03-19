let Cart = function(config, storage, sendAsync) {
  const setCartStorage = function(cart) {
    if (!cart) return null;
    if (cart.currency) storage.set('currency', cart.currency);
    // Remove PII information
    for (let field in cart) {
      if (!field.toLowerCase().match(/^customer/)) continue;
      delete cart[field];
    }
    // End remove PII information
    storage.set('cart_url', cart.url);
    return storage.setCache('cart', cart);
  }

  const cartUrl = function(cart_url) {
    let url = cart_url + '?formatted=true';
    if (config['expand'] && config['expand']['cart']) {
      url += '&expand=' + encodeURIComponent(config['expand']['cart']);
    }
    return url;
  }

  this.addItem = function(productID, quantity) {
    let self = this;
    return new Promise(function(resolve, reject) {
      const _addItem = function(cart) {
        const currency = storage.get('currency');
        if (!cart) {
          cart = {items: [], url: 'https://' + config['appHost'] + '/api/v1/carts' };
          if (currency) cart.currency = currency;
        }
        if (storage.isTest() && !productID.match(/\.test/)) productID += '.test';
        let url = cartUrl(cart.url);
        let existingItems = cart.items.filter(function(item) { return item.product_id == productID;});
        if (existingItems.length) {
          let existingItem = existingItems[0];
          if (storage.currencyMatch(cart) && (!isFinite(quantity) || existingItem.quantity == quantity)) {
            // Don't update again. Just return the cart.
            resolve(cart);
            return;
          }
          existingItem.quantity = quantity;
        } else {
          if (!isFinite(quantity)) quantity = 1;
          cart.items.push({product_id: productID, quantity: quantity});
        }
        if (currency && currency != cart.currency) cart.currency = currency;
        let options = { method: 'POST', body: JSON.stringify(cart) };
        sendAsync.send( url, options ).then(
          function(response) {
            resolve(setCartStorage(response));
          },
          function(error) {
            if (error.status != 403 && error.status != 401) {
              reject(error);
              return;
            }
            // Assuming limited token has expired.
            // going to attempt to create a new token and cart
            // to resolve it.
            sendAsync.send( url, options ).then(
              function(response) {
                resolve(setCartStorage(response));
              },
              function(error) {
                reject(error);
              }
            );
          }
        );
      };

      self.get().then(_addItem, function(error) { _addItem() });
    });
  };

  this.get = function() {
    let self = this;
    return new Promise(function(resolve, reject) {
      let cart = storage.getCache('cart');
      let cart_url = storage.get('cart_url');
      const currency = storage.get('currency');
      if (!cart && !cart_url) {
        reject({
          status: 404,
          message: "No cart",
          reference: "rQTetYt"
        });
        return;
      }
      if (cart && storage.currencyMatch(cart)) {
        resolve(cart);
        return;
      }
      let url = cartUrl(cart_url);
      let options = { method: 'GET' };
      if (currency && (!cart || !storage.currencyMatch(cart))) {
        // change to post and set currency instead of a get call.
        options = { method: 'POST', body: JSON.stringify({currency: currency}) };
      }
      sendAsync.send( url, options ).then(
        function(cart) {
          if (cart.open) {
            resolve(setCartStorage(cart));
            return;
          }
          storage.removeCache('cart');
          storage.remove('cart_url');
          reject({
            status: 422,
            message: "Cart not open",
            reference: "i23vM6g"
          });
        },
        function(error) {
          reject(error);
        }
      );
    });
  };

  this.checkout = function() {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.get().then(
        function(cart) {
          let token = storage.get('token');
          if (!cart || !token || !cart.open) {
            if (cart && !cart.open) {
              storage.removeCache('cart');
              storage.remove('cart_url');
            }
            resolve(false);
            return;
          }

          // Remove cart from cache to force an
          // immediate check if cart is still open.
          storage.removeCache('cart');

          let appUrl = 'https://' + config.appHost + '/' + config['appAlias'] + '/';
          let redirectUri = '/' + config['appAlias'] + '/';
          if (config['appPage']) redirectUri += '#/' + config['appPage'];

          let url = appUrl + 'oauth/callback.html#access_token=' + token + '&cart_id=' + cart.cart_id + '&redirect_uri=' + encodeURIComponent(redirectUri);
          window.location = url;
          resolve(true);
        },
        function(error) {
          resolve(false);
        }
      );
    });
  };

  this.removeItem = function(productID) {
    return this.addItem(productID, 0);
  };

}
