# express-rested

REST is a great way to create an HTTP API to manage resources. It's however a poor API to do rights management on top
on. Rights management is often based on CRUD (Create, Read, Update, Delete). A REST PUT operation however can mean
either create or update, depending on the resource already existing or not. The REST rules are simple to follow, but
when adding any logic, can be a bit of a pain. This module helps you get around that.

**In essence:**

* This module does not require you to set up any routes to manage your resources, it's all done for you.
* You have full control over rights management (CRUD style).
* You have full control over how (if) data should persist.
* Any object can be a resource, you register its constructor (or ES6 class).
* The resource classes you define can be used in browser as well as in Node.js, so you can write universal JavaScript.
* Resources are always sent back to the client in JSON format.
* In URLs, you may refer to resources with or without `.json` extension.


## Installation

```sh
npm install --save express-rested
```


## Usage

### Given a resource "Beer"

`resources/Beer.js`

```js
class Beer() {
	constructor(id, info) {
		this.id = id;
		this.edit(info);
	}

	createId() {
		this.id = this.name;
		return this.id;
	}

	edit(info) {
		this.name = info.name;
		this.rating = info.rating;
	}
}

module.exports = Beer;
```

### Examples

#### Base example

```js
const app = require('express')();
const rest = require('express-rested')(app);

rest.add(require('./resources/Beer'), '/rest/beers');

app.listen(3000);
```

#### Persisting data

```js
const beers = rest.add(require('./resources/Beer'), '/rest/beers');

beers.loadMap(require('./db/beers.json'));

beers.persist(function (ids, cb) {
	fs.writeFile('./db/beers.json', JSON.stringify(this), cb);
});
```

#### Rights management

```js
rest.add(require('./resources/Beer'), '/rest/beers', {
	rights: {
		read: true,     // anybody can read
		delete: false,  // nobody can delete
		create: function (req, res, resource) {
			return res.locals.isAdmin;  // admins can create
		},
		update: function (req, res, resource) {
			return res.locals.isAdmin;  // admins can update
		}
	}
});
```

#### Using an Express sub-router

```js
const express = require('express');
const app = express();
const router = new express.Router();
const rest = require('express-rested')(router);

app.use('/rest', router);

// not specifying a path means the collection path will become /rest/Beer

rest.add(require('./resources/Beer'));
```


## Supported REST calls

|           | GET               | POST               | PUT                             | DELETE            |
| --------- | ----------------- | ------------------ | ------------------------------- | ----------------- |
| /Beer     | Returns all beers | Creates a new beer | Sets the entire beer collection | Deletes all beers |
| /Beer/123 | Returns a beer    | Not supported      | Creates or updates a beer       | Deletes a beer    |


## API

Resource types can be declared as any class or constructor function. There are a few APIs however that you must or may
implement for things to work.


### Resource API

Your resource class may expose the following APIs:

**constructor(string|null id, Object info)**

This allows you to load objects into the collection. During a POST, the `id` will be `null`, as it will be assigned at
a later time using `createId()` (see below). If the data in `info` is not what it's supposed to be, you may throw an
error to bail out.

Required for HTTP methods: POST, PUT.

**edit(Object info) (optional)**

This enables updating of the resource value. The `info` argument is like the one in the constructor. If the data in
`info` is not what it's supposed to be, you may throw an error to bail out.

Required for HTTP method: PUT

**createId() -> string (optional)**

Should always return an ID that is fairly unique. It could be a UUID, but a username on a User resource would also be
perfectly fine. It's not the resource's job to ensure uniqueness. ID collisions will be handled gracefully by
express-rested. The `createId()` method **must** store the ID it generates and returns.

Required for HTTP method: POST

**Notes**

No other requirements exist on your resource. That also means that the ID used does not necessarily have to be stored in
an `id` property. It may be called anything. Express-rested will never interact with your resource instances beyond:

* reading the Class/constructor name (when auto-generating URL paths)
* Calling the constructor and methods mentioned above


### Rest library API

Importing the library:

**const rested = require('express-rested');**

This imports the library itself.

**const rest = rested([express.Router restRouter]);**

Instantiates a rest object on which you can create collections for resources.

Make sure that the express router you want to use has the JSON body parser enabled. Else we won't be able to receive
data. Also, ensure that it listens for incoming requests on a reasonable base URL (such as `/rest`). The URLs to our
collections will sit on top of this. The router is optional, but as you can imagine it hardly makes sense to use this
library without having it register HTTP routes.

**rest.add(constructor Class[, string path, Object options]) -> Collection**

Creates and returns a collection for objects of type `Class`. If you have set up an Express Router, all routes to this
collection will automatically be registered on it. The `path` you provide will be the sub-path on which all routes
are registered. For example the path `/beer` will sit on top of the base path (eg: `/rest`) and will therefore respond
to HTTP requests to the full route that is `/rest/beer`. If you do not provide a path, the name of the class you provide
will be used (and prefixed with `/`, eg.: `'/Beer'`).

Options (all optional):

* rights: an object, boolean or function that will be applied to all CRUD operations (read on for the applied logic).
* rights.create: a boolean or a function(req, res, resource) that returns a boolean indicating whether or not creation
  of this resource may occur.
* rights.read: a boolean or a function(req, res, resource) that returns a boolean indicating whether or not reading
  of this resource may occur.
* rights.update: a boolean or a function(req, res, resource) that returns a boolean indicating whether or not updating
  of this resource may occur.
* rights.delete: a boolean or a function(req, res, resource) that returns a boolean indicating whether or not deletion
  of this resource may occur.
* persist: a function that will be called after each modification of the collection. See the documentation on `persist`
  below for more information on the function signature.


### Resource collection API

**collection.loadMap(Object map)**

Fills up the collection with all objects in the map. The key in the map will be used as the ID. For each object,
`new Class(key, object)` will be called to instantiate the resource.

**collection.loadOne(string id, Object info)**

This instantiates a resource object from `info` and loads it into the collection.

**collection.has(id) -> boolean**

Returns `true` if the collection has a resource for the given `id`, `false` otherwise.

**collection.get(id) -> Class|undefined**

Returns the resource with the given `id` it it exists, `undefined` otherwise.

**collection.getIds() -> string[]**

Returns all IDs in the collection.

**collection.getMap() -> Object**

Returns a copy of the complete map of all resources.

**collection.getList() -> Class[]**

Returns all resources as an array.

**collection.set(string id, Class resource, Function cb)**

Ensures inclusion of the given resource into the collection. Triggers the `persist` callback.

**collection.setAll(Class resources[], Function cb)**

Deletes all resources not given, and creates or updates all resources given in the `resources` array. Triggers the
`persist` callback.

**collection.del(string id, Function cb)**

Deletes a single resource from the collection. Triggers the `persist` callback.

**collection.delAll(Function cb)**

Empties the entire collection. Triggers the `persist` callback.

**collection.persist(function (string ids[], [Function cb]) { })**

Registers a function that will be called on any change to the collection, and is passed an array of IDs that were
affected. If you pass a callback, you will have a chance to do asynchronous operations and return an error on failure.
This error will find its way to the client as an Internal Service Error (500). If you don't pass a callback, you may
still throw an exception to achieve the same.


## License

MIT
