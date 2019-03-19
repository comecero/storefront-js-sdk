# storefront-sdk.js

### Version: 0.9.4

This library allows an account to host carts on their website without redirecting customers to
hosted carts.  Our goal for this library that does NOT rely on any javascript library/framework so it can be
used with any javascript library/framework without causing addition overhead or incompatibilites between
frameworks.  If you are using angularjs 1.x, jquery, reactjs, and/or other libraries, this library is not
expected to cause issues or prevent the use of this library.

## Example Usage:
```javascript
  let config = {"accountID": "Your account ID here", ...};
  var storefrontSDK = new StorefrontSDK(config);
  storefrontSDK.cart().addItem('1001').then(
    function(cart) {
      // Do something with cart such as render cart
    },
    function(error) {
      // Do something with error such as remove cart and display an error.
    }
  );
```


## Configuration options:
* appHost: The application host specified for your account (Test or Live).  Found in Settings --> Technical

* accountID: Your account ID.

* appAlias: The app alias that the checkout should redirect to.

* appPage: The page of the app the customer should start on when redirected to checkout.

* cacheTimeout: Optional browser cache of data before refreshing from the api (Default: 300).

* testToken: Provide this only for testing purposes.  Do not hard code into your app. (Default: null).


## Public methods:
* cart(): gets the cart service.
* products(): gets the products service.
* currency([currency]): gets/sets currency for all services.
> return value is the updated currency or null if not set.
> Note: you will need to call get() on services to get the updated exchange rates pricing.


## cart() public methods.

* addItem(productID [, quantity]):  Adds productID to cart. Quantity is optional (default: 1)
> If productID is already in cart, adding again will only have an affect if quantity is different.

> When in test mode, will automatically append .test to productID if not present.

> return value is a promise that will resolve to a cart object or reject an error.

* removeItem(productID): Removes productID from cart.
> return value is a promise that will resolve to a cart object or reject an error.

* get(): gets current cart.
> return value is a promise that will resolve to a cart object or reject an error.

* checkout(): if cart is open redirects user to app and app page specific in config.
> return value is a promise that will resolve to true if redirecting otherwise false.

## products() public methods.

* get(productID): gets a product out of the catalog.
> return value is a promise that will resolve to a product object or reject an error.

## reject response.
* status: http status code of the error (Can be -1 if client side network error).
* message: Human readable error message.
* reference: Error reference ID
