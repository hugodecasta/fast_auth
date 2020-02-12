# fast_auth
Simple Auth system

## usage

The fast_auth system is based on a key/token system allowing one connected with the token to access data from the mother key.

When a connection is initiated, the main goal is to give a token, copy of the key data, to the connecting user.

``` javascript

// ---

const FastAuth = require('fast_auth')

// ---

const auth_data_dir_path = process.argv[2]
const key_string = process.argv[3]

var fast_auth = new FastAuth(auth_data_dir_path)

// ---

let key_data = fast_auth.get_key_data(key_string)

if(key_data == null) {

  console.error('given key string incorrect !')
  process.exit(1)
  
} else {

  let token = fast_auth.get_token(key_string)
  let token_data = fast_auth.get_token_data(token)
  
  console.log(token,token_data.data())

}

```

Note: the `auth_data_dir_path` variable is required to indicate the auth data directory path. If this path does not exist, the storage system will create it for you (with rights according to the executing user).

## auth system

The fast_auth system uses the [storage](https://github.com/hugodecasta/storage) module to store encrypted keys and tokens data.

#### key

When registering a new key, a data json formated object is needed. The key string is generated randomly but it is possible to give a predefined key string.

``` javascript

fast_auth.prefix = 'prefix'
fast_auth.suffix = 'suffix'

let key_data = {
  "my_api" : { life:1000, price:1 },
  "another_api" : { life:1000, price:4 },
}

let key_string = fast_auth.create_key(key_data)

console.log(key_string)
// prefixbc3dcb2b-a507-4d0f-a25d-79b4685e45a3suffix

let loaded_key_data = fast_auth.get_key_data(key_string)
console.log(JSON.stringify(loaded_key_data) == JSON.stringify(key_data))
// true

```

#### token

The token is a sub key, full copy of the refered key data. When altering data, use the token data to make your decisions.

``` javascript

function access_api(api_name, token) {

  // ---

  let token_data = fast_auth.get_token_data(token)
  let api_map = token_data.data()
  
  // ---
  
  if(api_name in api_map) {
  
    let api_data = api_map[api_name]
    api_data.life = api_data.life - api_data.price
    token_data.set_data(api_map)
    
    if(api_data.life <= 0) {
      console.error('api out of credit !')
      return null
    } else {
      return execute_api(api_name)
    }
    
  }
  
  // ---
  
  console.error('api not found')
  return null

}
