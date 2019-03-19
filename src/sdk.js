var StorefrontSDK = function(config) {
  //%= body %

  if (!window.Promise || !window.localStorage) throw "Browser does not support ES6";
  const requiredConfigValues = ['appHost', 'accountID'];
  const defaultConfig = {cacheTimeout: 300};

  // Lets set some defaults if needed.
  for (const key in defaultConfig) {
    if (!config[key]) config[key] = defaultConfig[key];
  }

  for (const idx in requiredConfigValues) {
    const key = requiredConfigValues[idx];
    if (!config[key]) throw "missing required configuration value: " + key;
  }

  // Validate some configuration values
  config['cacheTimeout'] = parseInt(config['cacheTimeout']);
  if (!isFinite(config['cacheTimeout']) || config['cacheTimeout'] < 60) config['cacheTimeout'] = 60;


  // Storage defined here.
  const storage = new Storage(config);
  const sendAsync = new SendAsync(config, storage);
  let products; // Lazy loading
  let cart; // Lazy loading

  this.products = function() {
    if (!products) products = new Products(config, storage, sendAsync);
    return products;
  }

  this.cart = function() {
    if (!cart) cart = new Cart(config, storage, sendAsync);
    return cart;
  }

  this.currency = function() {
    if (arguments.length == 1) {
      // Setter.
      let currency = arguments[0];
      if (currency == null || (typeof currency == 'string' && currency.length == 0)) {
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
  }
}
