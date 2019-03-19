/*
  Comecero Data Export version: 0.9.4
  https://comecero.com
  https://github.com/comecero/data-export
  Copyright Comecero and other contributors. Released under MIT license. See LICENSE for details.
*/

var StorefrontSDK = function (config) {
    let Cart = function (config, storage, sendAsync) {
        const setCartStorage = function (cart) {
            if (!cart)
                return null;
            if (cart.currency)
                storage.set('currency', cart.currency);
            // Remove PII information
            for (let field in cart) {
                if (!field.toLowerCase().match(/^customer/))
                    continue;
                delete cart[field];
            }
            // End remove PII information
            storage.set('cart_url', cart.url);
            return storage.setCache('cart', cart);
        };
        const cartUrl = function (cart_url) {
            let url = cart_url + '?formatted=true';
            if (config['expand'] && config['expand']['cart']) {
                url += '&expand=' + encodeURIComponent(config['expand']['cart']);
            }
            return url;
        };
        this.addItem = function (productID, quantity) {
            let self = this;
            return new Promise(function (resolve, reject) {
                const _addItem = function (cart) {
                    const currency = storage.get('currency');
                    if (!cart) {
                        cart = {
                            items: [],
                            url: 'https://' + config['appHost'] + '/api/v1/carts'
                        };
                        if (currency)
                            cart.currency = currency;
                    }
                    if (storage.isTest() && !productID.match(/\.test/))
                        productID += '.test';
                    let url = cartUrl(cart.url);
                    let existingItems = cart.items.filter(function (item) {
                        return item.product_id == productID;
                    });
                    if (existingItems.length) {
                        let existingItem = existingItems[0];
                        if (storage.currencyMatch(cart) && (!isFinite(quantity) || existingItem.quantity == quantity)) {
                            // Don't update again. Just return the cart.
                            resolve(cart);
                            return;
                        }
                        existingItem.quantity = quantity;
                    } else {
                        if (!isFinite(quantity))
                            quantity = 1;
                        cart.items.push({
                            product_id: productID,
                            quantity: quantity
                        });
                    }
                    if (currency && currency != cart.currency)
                        cart.currency = currency;
                    let options = {
                        method: 'POST',
                        body: JSON.stringify(cart)
                    };
                    sendAsync.send(url, options).then(function (response) {
                        resolve(setCartStorage(response));
                    }, function (error) {
                        if (error.status != 403 && error.status != 401) {
                            reject(error);
                            return;
                        }
                        // Assuming limited token has expired.
                        // going to attempt to create a new token and cart
                        // to resolve it.
                        sendAsync.send(url, options).then(function (response) {
                            resolve(setCartStorage(response));
                        }, function (error) {
                            reject(error);
                        });
                    });
                };
                self.get().then(_addItem, function (error) {
                    _addItem();
                });
            });
        };
        this.get = function () {
            let self = this;
            return new Promise(function (resolve, reject) {
                let cart = storage.getCache('cart');
                let cart_url = storage.get('cart_url');
                const currency = storage.get('currency');
                if (!cart && !cart_url) {
                    reject({
                        status: 404,
                        message: 'No cart',
                        reference: 'rQTetYt'
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
                    options = {
                        method: 'POST',
                        body: JSON.stringify({ currency: currency })
                    };
                }
                sendAsync.send(url, options).then(function (cart) {
                    if (cart.open) {
                        resolve(setCartStorage(cart));
                        return;
                    }
                    storage.removeCache('cart');
                    storage.remove('cart_url');
                    reject({
                        status: 422,
                        message: 'Cart not open',
                        reference: 'i23vM6g'
                    });
                }, function (error) {
                    reject(error);
                });
            });
        };
        this.checkout = function () {
            const self = this;
            return new Promise(function (resolve, reject) {
                self.get().then(function (cart) {
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
                    if (config['appPage'])
                        redirectUri += '#/' + config['appPage'];
                    let url = appUrl + 'oauth/callback.html#access_token=' + token + '&cart_id=' + cart.cart_id + '&redirect_uri=' + encodeURIComponent(redirectUri);
                    window.location = url;
                    resolve(true);
                }, function (error) {
                    resolve(false);
                });
            });
        };
        this.removeItem = function (productID) {
            return this.addItem(productID, 0);
        };
    };
    let Products = function (config, storage, sendAsync) {
        this.get = function (productID) {
            return new Promise(function (resolve, reject) {
                if (storage.isTest() && !productID.match(/\.test/))
                    productID += '.test';
                let currency = storage.get('currency');
                let cacheKey = 'product:' + productID + ':' + currency;
                let product = storage.getCache(cacheKey);
                if (product) {
                    resolve(product);
                    return;
                }
                let url = 'https://' + config['appHost'] + '/api/v1/products/' + productID + '?formatted=true';
                if (currency)
                    url += '&currency=' + currency;
                sendAsync.send(url, { method: 'GET' }).then(function (product) {
                    if (!currency && product.currency) {
                        storage.set('currency', product.currency);
                        cacheKey = 'product:' + productID + ':' + product.currency;
                    }
                    storage.setCache(cacheKey, product);
                    resolve(product);
                }, function (error) {
                    reject(error);
                });
            });
        };
    };
    let SendAsync = function (config, storage) {
        const _sendAsyncRaw = function (url, options) {
            if (!options['cache'])
                options['cache'] = 'no-cache';
            return new Promise(function (resolve, reject) {
                fetch(url, options).then(function (response) {
                    if (response.status == 204) {
                        resolve(null);
                        return;
                    }
                    var contentType = response.headers.get('content-type');
                    if (contentType.match(/\/json$/i)) {
                        response.json().then(function (parsedJSON) {
                            if (parseInt(response.status / 100) != 2) {
                                const error = parsedJSON.error ? parsedJSON.error : parsedJSON;
                                reject({
                                    status: response.status,
                                    message: error.message,
                                    reference: error.reference
                                });
                                return;
                            }
                            resolve(parsedJSON);
                            return;
                        }, function (error) {
                            reject({
                                status: response.status,
                                message: error,
                                reference: '9DrqfC8'
                            });
                        });
                        return;
                    }
                    reject({
                        status: response.status,
                        message: 'Unexpected content type: ' + contentType,
                        reference: '8llaW8G'
                    });
                }, function (error) {
                    reject({
                        status: -1,
                        message: error.message,
                        reference: '7IGiWX0'
                    });
                });
            });
        };
        const getLimitedToken = function () {
            return new Promise(function (resolve, reject) {
                let token = storage.get('token');
                if (token) {
                    resolve(token);
                    return;
                }
                let testToken = storage.get('testToken');
                let url = 'https://' + config.appHost + '/api/v1/auths/limited?show=token,expires_in_seconds&account_id=' + config['accountID'];
                let options = {
                    'method': 'POST',
                    'headers': { 'Content-Type': 'application/json' }
                };
                if (testToken) {
                    if (testToken != 'public')
                        options['headers']['Authorization'] = 'Bearer ' + testToken;
                    url += '&test=true';
                }
                _sendAsyncRaw(url, options).then(function (json) {
                    if (!json.token) {
                        reject({
                            status: 403,
                            message: 'Unable to obtain authorization',
                            reference: 'EobzCgb'
                        });
                        return;
                    }
                    resolve(storage.set('token', json.token));
                }, function (error) {
                    reject(error);
                });
            });
        };
        this.send = function (url, options) {
            return new Promise(function (resolve, reject) {
                getLimitedToken().then(function (token) {
                    if (options == undefined)
                        options = {};
                    if (options['headers'] == undefined)
                        options['headers'] = {};
                    options['headers']['Content-Type'] = 'application/json';
                    options['headers']['Authorization'] = 'Bearer ' + token;
                    _sendAsyncRaw(url, options).then(function (response) {
                        resolve(response);
                    }, function (error) {
                        if (error.status == 403 || error.status == 401) {
                            // Assuming limited token has expired.
                            storage.clear();
                        }
                        reject(error);
                    });
                }, function (error) {
                    reject(error);
                });
            });
        };
    };
    let Storage = function (config) {
        // key used for local storage.
        const localStorageKey = 'storefront-js-sdk-' + config['accountID'];
        const ttl = config['cacheTimeout'];
        this.get = function (key) {
            const json = window.localStorage.getItem(localStorageKey);
            if (!json)
                return null;
            const data = JSON.parse(json);
            return data[key];
        };
        this.set = function (key, value) {
            const json = window.localStorage.getItem(localStorageKey);
            let data = json ? JSON.parse(json) : {};
            data[key] = value;
            window.localStorage.setItem(localStorageKey, JSON.stringify(data));
            return value;
        };
        this.remove = function (key) {
            const json = window.localStorage.getItem(localStorageKey);
            let data = json ? JSON.parse(json) : {};
            delete data[key];
            window.localStorage.setItem(localStorageKey, JSON.stringify(data));
        };
        this.purgeCache = function () {
            const data = this.get('_cache');
            if (!data)
                return;
            let purged = false;
            for (let key in data) {
                let value = data[key];
                if (this.isExpired(value.expires)) {
                    purged = true;
                    delete data[key];
                }
            }
            if (purged)
                this.set('_cache', data);
        };
        this.getCache = function (key) {
            this.purgeCache();
            let data = this.get('_cache');
            if (!data)
                return null;
            let value = data[key];
            if (!value)
                return null;
            return value.data;
        };
        this.setCache = function (key, value) {
            this.purgeCache();
            const expires = Date.now() + ttl * 1000;
            let data = this.get('_cache');
            if (!data)
                data = {};
            data[key] = {
                expires: expires,
                data: value
            };
            this.set('_cache', data);
            return value;
        };
        this.removeCache = function (key) {
            let data = this.get('_cache');
            if (!data || !data[key])
                return;
            delete data[key];
            this.set('_cache', data);
        };
        this.isTest = function () {
            const token = this.get('testToken');
            return token && token.length > 0;
        };
        this.isExpired = function (expires) {
            const now = Date.now();
            const expiresDate = expires ? new Date(parseInt(expires)) : now;
            return now >= expiresDate;
        };
        this.currencyMatch = function (obj) {
            const currency = this.get('currency');
            return !currency || !obj || !obj.currency || currency == obj.currency;
        };
        this.clear = function () {
            const token = this.get('testToken');
            let data = {};
            if (token) {
                // preserve the testToken.
                data['testToken'] = token;
            }
            window.localStorage.setItem(localStorageKey, JSON.stringify(data));
            window.localStorage.removeItem(localStorageCacheKey);
        };
        if (config['testToken']) {
            let token = this.get('token');
            if (config['testToken'] == 'clear') {
                this.remove('testToken');
                if (token && token.match(/\.test\./))
                    this.clear();
            } else {
                this.set('testToken', config['testToken']);
                if (token && !token.match(/\.test\./))
                    this.clear();
            }
        }
        // On load, purge cache
        this.purgeCache();
    };
    if (!window.Promise || !window.localStorage)
        throw 'Browser does not support ES6';
    const requiredConfigValues = [
        'appHost',
        'accountID',
        'appAlias',
        'appPage'
    ];
    const defaultConfig = { cacheTimeout: 300 };    // Lets set some defaults if needed.
    // Lets set some defaults if needed.
    for (const key in defaultConfig) {
        if (!config[key])
            config[key] = defaultConfig[key];
    }
    for (const idx in requiredConfigValues) {
        const key = requiredConfigValues[idx];
        if (!config[key])
            throw 'missing required configuration value: ' + key;
    }    // Validate some configuration values
    // Validate some configuration values
    config['cacheTimeout'] = parseInt(config['cacheTimeout']);
    if (!isFinite(config['cacheTimeout']) || config['cacheTimeout'] < 60)
        config['cacheTimeout'] = 60;    // Storage defined here.
    // Storage defined here.
    const storage = new Storage(config);
    const sendAsync = new SendAsync(config, storage);
    let products;    // Lazy loading
    // Lazy loading
    let cart;    // Lazy loading
    // Lazy loading
    this.products = function () {
        if (!products)
            products = new Products(config, storage, sendAsync);
        return products;
    };
    this.cart = function () {
        if (!cart)
            cart = new Cart(config, storage, sendAsync);
        return cart;
    };
    this.currency = function () {
        if (arguments.length == 1) {
            // Setter.
            let currency = arguments[0];
            if (currency == null || typeof currency == 'string' && currency.length == 0) {
                storage.remove('currency');
            } else if (typeof currency == 'string') {
                currency = currency.toUpperCase();
                if (currency.match(/^[A-Z]{3}$/)) {
                    storage.set('currency', currency);
                }
            }
        }
        const currency = storage.get('currency');
        return currency ? currency : null;
    };
};