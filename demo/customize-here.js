/*
 * Javascript in this file is an example of how to consume the storefront SDK.  This is an example and you are
 * free to use it as a basis for your needs.  Bare in mind, you site may not need all of it and only pieces.
 * We recommend implementing what you need and use assets that your site currently uses to help minimize load
 * times.
 *
 * This example uses mustache.js to render html on the page and is just one library that does this. You should
 * research alternatives and evaluate the pros and cons based on your meeds.
 *
 */

let templateCache = {};
let renderTemplate = function(templateUri, view) {
  return new Promise(function(resolve, reject) {
    if (templateCache[templateUri]) {
      var rendered = Mustache.render(templateCache[templateUri], view);
      resolve(rendered);
      return;
    }
    let fullPath = window.location.pathname.replace(/\/demo\/.*/, '/demo/') + templateUri;
    fetch(fullPath, {method: 'GET', cache: 'no-cache' }).then(
      function(response) {
        if (!response.ok) {
          reject(response);
          return;
        }
        response.text().then(function(text) {
          var rendered = Mustache.render(text, view);
          templateCache[templateUri] = text;
          resolve(rendered);
        },
        function(error) {
          reject(error);
        });
      },
      function(error) {
        reject(error);
      });
  });
}

let render = function(cart) {
  let currencySelect = document.getElementById("currency");
  if (!cart) cart = {items_count: 0};
  if (currencySelect && cart.currency) currencySelect.value = cart.currency;

  let cartButtonElement = document.getElementById("cartButton");
  if (cartButtonElement) {
    renderTemplate('mst/cart-dropdown.mst', cart).then(function(rendered) {
      cartButtonElement.innerHTML = rendered;
    }, function(error) {
      console.log(error);
    });
  }

  let cartElement = document.getElementById("cart");
  if (cartElement) {
    renderTemplate('mst/cart.mst', cart).then(function(rendered) {
      cartElement.innerHTML = rendered;
    }, function(error) {
      console.log(error);
    });
  }
}

var storefrontSDK = new StorefrontSDK({
  'appHost': 'demo-account-test.apps.comecero.com',
  'accountID': 'DA1113',
  'testToken': 'public',
  'cart': {
    'appAlias': 'shopping-cart',
    'appPage': 'cart',
    'expand': 'items.product'
  }
});

var handleError = function(error) {
  console.log(error);
  var div = document.querySelector("#warningAlert");
  div.innerHTML = JSON.stringify(error, undefined, 2);
  let classNames = div.className.split(/\s+/);
  let idx = classNames.indexOf('hidden');
  if (idx >= 0) classNames.splice(idx,1);
  div.className = classNames.join(' ');
}

var addItem = function(productID, quantity) {
  hideAlert();
  // Do something before remove. Such as start a spinner.
  storefrontSDK.cart().addItem(productID, quantity).then(
    function(cart) {
      render(cart);
      // Do something once done. Such as stop a spinner.
    },
    function(error) {
      handleError(error);
      // Do something useful with the error
      // Do something once done. Such as stop a spinner.
    }
  );
}

var removeItem = function(productID) {
  hideAlert();
  // Do something before remove. Such as start a spinner.
  storefrontSDK.cart().removeItem(productID).then(
    function(cart) {
      render(cart);
      // Do something once done. Such as stop a spinner.
    },
    function(error) {
      // Do something useful with the error
      // Do something once done. Such as stop a spinner.
      handleError(error);
    }
  );
}

var toggleCart = function() {
  let cart = document.getElementById("cartDropdown");
  if (!cart) return;
  let classNames = cart.className.split(/\s+/);
  let idx = classNames.indexOf('hidden');
  if (idx >= 0) {
    classNames.splice(idx,1);
  } else {
    classNames.push('hidden');
  }
  cart.className = classNames.join(' ');
}

var gotoCart = function() {
  if (window.location.pathname.indexOf('/cart') >= 0) return;
  window.location.pathname += 'cart/';
}

var updatePrices = function() {
  const productPrice = function(element) {
    if (!element.attributes || !element.attributes['data-product-price']) return;
    const productID = element.attributes['data-product-price'].value;
    storefrontSDK.products().get(productID).then(
      function(product) {
        element.innerHTML = product.formatted.price;
      },
      function(error) {
        handleError(error);
      }
    );
  }

  var divs = document.querySelectorAll("div[data-product-price]");
  for (var i in divs) {
    productPrice(divs[i]);
  }

}

var hideAlert = function() {
  let divs = document.querySelectorAll("div.alert-dismissible");
  for (let i=0;i<divs.length;i++) {
    let div = divs[i];
    let classNames = div.className.split(/\s+/);
    let idx = classNames.indexOf('hidden');
    if (idx < 0) {
      classNames.push('hidden');
      div.className = classNames.join(' ');
    }
  }
}

var changeCurrency = function() {
  hideAlert();
  let currency = document.getElementById("currency");
  if (!currency) return;
  storefrontSDK.currency(currency.value);
  if (currency.value) {
    let autoCurrency = document.getElementById("autoCurrency");
    autoCurrency.style = 'display: none;';
  }
  updatePrices();
  storefrontSDK.cart().get().then(
    function(cart) {
      render(cart);
    },
    function(error) {
      // Do something?
      if (error && error.message.toLowerCase() != 'no cart')
        handleError(error);
    }
  );
}

window.addEventListener("DOMContentLoaded", () => {
  updatePrices();
  let currencySelect = document.getElementById("currency");
  let currency = storefrontSDK.currency();
  if (currency) {
    currencySelect.value = currency;
    let autoCurrency = document.getElementById("autoCurrency");
    autoCurrency.style = 'display: none;';
  }

  storefrontSDK.cart().get().then(
    function(cart) {
      render(cart);
    },
    function(error) {
      render();
    }
  );
});
