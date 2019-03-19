let Storage = function(config) {
  // key used for local storage.
  const localStorageKey = 'storefront-js-sdk-' + config['accountID'];
  const ttl = config['cacheTimeout'];

  const isExpired = function(expires) {
    const now = Date.now();
    const expiresDate = expires ? new Date(parseInt(expires)) : now;
    return now >= expiresDate;
  }

  this.get = function(key) {
    const json = window.localStorage.getItem(localStorageKey);
    if (!json) return null;
    const data = JSON.parse(json);
    return data[key];
  }

  this.set = function(key, value) {
    const json = window.localStorage.getItem(localStorageKey);
    let data = json ? JSON.parse(json) : {};
    data[key] = value;
    window.localStorage.setItem(localStorageKey, JSON.stringify(data));
    return value;
  }

  this.remove = function(key) {
    const json = window.localStorage.getItem(localStorageKey);
    let data = json ? JSON.parse(json) : {};
    delete data[key];
    window.localStorage.setItem(localStorageKey, JSON.stringify(data));
  }

  this.purgeCache = function() {
    let data = this.get('_cache');
    if (!data) return;
    let purged = false;
    for (let key in data) {
      let value = data[key];
      if (isExpired(value.expires)) {
        purged = true;
        delete data[key];
      }
    }
    if (purged) this.set('_cache', data);
  }

  this.getCache = function(key) {
    this.purgeCache();
    let data = this.get('_cache');
    if (!data) return null;
    let value = data[key];
    if (!value) return null;
    return value.data;
  }

  this.setCache = function(key, value) {
    this.purgeCache();
    const expires = Date.now() + ttl*1000;
    let data = this.get('_cache');
    if (!data) data = {};
    data[key] = {
      expires: expires,
      data: value
    }
    this.set('_cache', data);
    return value;
  }

  this.removeCache = function(key) {
    let data = this.get('_cache');
    if (!data || !data[key]) return;
    delete data[key];
    this.set('_cache', data);
  }

  this.isTest = function() {
    const token = this.get('testToken');
    return token && token.length > 0;
  }

  this.currencyMatch = function(obj) {
    const currency = this.get('currency');
    return !currency || !obj || !obj.currency || currency == obj.currency;
  }

  this.clear = function() {
    const token = this.get('testToken');
    let data = {};
    if (token) {
      // preserve the testToken.
      data['testToken'] = token;
    }
    window.localStorage.setItem(localStorageKey, JSON.stringify(data));
    window.localStorage.removeItem(localStorageCacheKey);
  }

  if (config['testToken']) {
    let token = this.get('token');
    if (config['testToken'] == 'clear') {
      this.remove('testToken');
      if (token && token.match(/\.test\./)) this.clear();
    } else {
      this.set('testToken', config['testToken']);
      if (token && !token.match(/\.test\./)) this.clear();
    }
  }

  // On load, purge cache
  this.purgeCache();

}
