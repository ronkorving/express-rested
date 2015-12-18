'use strict';

module.exports = function (collection, context, cb) {
	const id = context.baseName;
	const resource = collection.get(id);

	if (resource === undefined) {
		return cb(context.setStatus(404)); // Not found
	}

	if (!context.isJson()) {
		const fn = context.createCustomFn('get', resource);
		if (!fn) {
			return cb(context.setStatus(415)); // Unsupported Media Type
		}

		return fn();
	}

	if (!context.mayRead(resource)) {
		return cb(context.disallow(resource)); // Method not allowed
	}

	return cb(context.setStatus(200).setBody(resource)); // OK
};