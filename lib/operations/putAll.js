'use strict';

module.exports = function putAll(collection, context, data, cb) {
	if (!data || typeof data !== 'object') {
		return cb(context.setStatus(400)); // Bad request
	}

	const resources = {};
	const ids = Object.keys(data);
	const toDelete = collection.getMap();

	for (let i = 0; i < ids.length; i++) {
		const id = ids[i];
		let resource = collection.get(id);

		if (!resource) {
			// create

			resource = collection.instantiate(id, data[id]);
			if (!resource) {
				return cb(context.setStatus(400)); // Bad request
			}

			if (!context.mayCreate(resource)) {
				return cb(context.disallow(resource)); // Method not allowed
			}
		} else {
			// update

			if (!context.mayUpdate(resource)) {
				return cb(context.disallow(resource)); // Method not allowed
			}

			try {
				resource.edit(data[id]);
			} catch (error) {
				return cb(context.setStatus(400)); // Bad request
			}

			// forget about deleting this resource

			delete toDelete[id];
		}

		resources[id] = resource;
	}

	// check deletion rights

	const deleteIds = Object.keys(toDelete);

	for (let i = 0; i < deleteIds.length; i++) {
		const resource = toDelete[deleteIds[i]];

		if (!context.mayDelete(resource)) {
			return cb(context.disallow(resource)); // Method not allowed
		}
	}

	// persist

	collection.setAll(resources, function (error) {
		if (error) {
			return cb(context.setStatus(500)); // Internal server error
		}

		return cb(context.setStatus(204)); // No content
	});
};
