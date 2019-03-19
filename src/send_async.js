
let SendAsync = function(config, storage) {
  const _sendAsyncRaw = function(url, options) {
    if (!options['cache']) options['cache'] = "no-cache";
    return new Promise(function(resolve, reject) {
      fetch( url, options ).then(
        function(response) {
          if (response.status == 204) {
            resolve(null);
            return;
          }
          var contentType = response.headers.get("content-type");
          if (contentType.match(/\/json$/i)) {
            response.json().then(
              function(parsedJSON) {
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
              },
              function(error) {
                reject({
                  status: response.status,
                  message: error,
                  reference: "9DrqfC8"
                });
              }
            );
            return;
          }
          reject({
            status: response.status,
            message: "Unexpected content type: " + contentType,
            reference: "8llaW8G"
          });
        },
        function(error) {
          reject({
            status: -1,
            message: error.message,
            reference: "7IGiWX0"
          });
        }
      );
    });
  }

  const getLimitedToken = function() {
    return new Promise(function(resolve, reject) {
      let token = storage.get('token');

      if (token) {
        resolve(token);
        return;
      }

      let testToken = storage.get('testToken');
      let url = 'https://' + config.appHost + '/api/v1/auths/limited?show=token,expires_in_seconds&account_id=' + config['accountID'];
      let options = {
        'method': 'POST',
        'headers': {
          'Content-Type': 'application/json'
        }
      };

      if (testToken) {
        if (testToken != 'public') options['headers']['Authorization'] = 'Bearer ' + testToken;
        url += '&test=true';
      }

      _sendAsyncRaw(url, options).then(
        function(json) {
          if (!json.token) {
            reject({
              status: 403,
              message: 'Unable to obtain authorization',
              reference: "EobzCgb"
            });
            return;
          }
          resolve(storage.set('token', json.token));
        },
        function(error) {
          reject(error);
        }
      );
    });
  }

  this.send = function(url, options) {
    return new Promise(function(resolve, reject) {
      getLimitedToken().then(
        function(token) {
          if (options == undefined) options = {};
          if (options['headers'] == undefined) options['headers'] = {};
          options['headers']['Content-Type'] = "application/json";
          options['headers']["Authorization"] = 'Bearer ' + token;

          _sendAsyncRaw(url, options).then(
            function(response) {
              resolve(response);
            },
            function(error) {
              if (error.status == 403 || error.status == 401) {
                // Assuming limited token has expired.
                storage.clear();
              }
              reject(error);
            }
          );
        },
        function(error) {
          reject(error);
        });
    });
  }
}
