'use strict';

module.exports = function (collection, context, obj, cb) {
	const id = context.baseName;
	const resource = collection.get(id);

	if (!resource) {
		return cb(context.setStatus(404)); // Not Found
	}

	if (!context.isJson()) {
		const fn = context.createCustomFn('patch', resource);
		if (!fn) {
			return cb(context.setStatus(415)); // Unsupported Media Type
		}

		return fn();
	}

	if (!context.mayUpdate(resource)) {
		return cb(context.disallow(resource)); // Method not allowed
	}

	try {
		resource.edit(obj);
	} catch (error) {
		return cb(context.setStatus(400)); // Bad request
	}

	collection.set(id, resource, function (error) {
		if (error) {
			return cb(context.setStatus(500)); // Internal server error
		}

		return cb(context.setStatus(204)); // No content
	});
};