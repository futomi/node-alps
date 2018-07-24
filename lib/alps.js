/* ------------------------------------------------------------------
* node-alps - alps.js
* Date: 2017-07-24
* ---------------------------------------------------------------- */
'use strict';
const AlpsDevice = require('./modules/device.js');
const AlpsAdvertising = require('./modules/advertising.js');

/* ------------------------------------------------------------------
* Constructor: Alps(params)
* - params:
*     noble  : The Nobel object created by the noble module.
*              This parameter is optional. If you don't specify
*              this parameter, this module automatically creates it.
* ---------------------------------------------------------------- */
const Alps = function(params) {
	// Plublic properties
	this.noble = null;
	if(params && 'noble' in params) {
		if(typeof(params['noble']) === 'object') {
			this.noble = params['noble'];
		} else {
			throw new Error('The value of the "noble" property is invalid.');
		}
	} else {
		this.noble = require('noble');
	}
	this.onadvertisement = null;
	this.ondiscover = null;

	// Private properties
	this._devices = {};
	this._discover_status = false;
	this._discover_wait_max = 60000; // ms
	this._default_local_name = 'SNM00'
};

/* ------------------------------------------------------------------
* Method: init()
* ---------------------------------------------------------------- */
Alps.prototype.init = function() {
	let promise = new Promise((resolve, reject) => {
		this.initialized = false;
		if(this.noble.state === 'poweredOn') {
			this.initialized = true;
			resolve();
		} else {
			this.noble.once('stateChange', (state) => {
				if(state === 'poweredOn') {
					this.initialized = true;
					resolve();
				} else {
					let err = new Error('Failed to initialize the Noble object: ' + state);
					reject(err);
				}
			});
		}
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: discover([p])
* - p = {
*     duration: 5000, // Duration for discovery process (msec)
*     name: '' // Full match
*     idFilter: '' // Forward match
*     quick: false
*   }
* ---------------------------------------------------------------- */
Alps.prototype.discover = function(p) {
	this._checkInitialized();

	let duration = 5000;
	let name = '';
	let id_filter = '';
	let quick = false;
	if(p && typeof(p) === 'object') {
		if(('duration' in p) && typeof(p['duration']) === 'number') {
			duration = p['duration'];
			if(duration < 1000) {
				duration = 1000;
			} else if(duration > this._discover_wait_max) {
				duration = this._discover_wait_max;
			}
		}
		if(('name' in p) && typeof(p['name'] === 'string')) {
			name = p['name'];
		}
		if(('idFilter' in p) && typeof(p['idFilter'] === 'string')) {
			id_filter = p['idFilter'];
		}
		if(('quick' in p) && typeof(p['quick'] === 'boolean')) {
			quick = p['quick'];
		}
	}

	let promise = new Promise((resolve, reject) => {
		let timer = null;
		let finishDiscovery = () => {
			if(timer) {
				clearTimeout(timer);
			}
			this.stopScan();
			let device_list = [];
			for(let id in this._devices) {
				device_list.push(this._devices[id]);
			}
			resolve(device_list);
		};
		this._devices = {};
		this.noble.on('discover', (peripheral) => {
			let dev = this._discoveredDevice(peripheral, name, id_filter);
			if(quick && dev) {
				finishDiscovery();
				return;
			}
		});
		this.noble.startScanning([], false);
		this._discover_status = true;
		timer = setTimeout(() => {
			finishDiscovery();
		}, duration);
	});
	return promise;
};

Alps.prototype._checkInitialized = function() {
	if(this.initialized === false) {
		throw new Error('The `init()` method has not been called yet.');
	}
	if(this._discover_status === true) {
		throw new Error('The `discover()` or the `startScan()` method is in progress.');
	}
};

Alps.prototype._discoveredDevice = function(peripheral, name, id_filter) {
	if(!this._isAlpsDevice(peripheral, name, id_filter)) {
		return null;
	}
	var id = peripheral.id;
	if(this._devices[id]) {
		return null;
	}
	let device = new AlpsDevice(this.noble, peripheral);
	if(this.ondiscover && typeof(this.ondiscover) === 'function') {
		this.ondiscover(device);
	}
	this._devices[id] = device;
	return device;
};

Alps.prototype._isAlpsDevice = function(peripheral, name, id_filter, uuid) {
	var ad = peripheral.advertisement;
	if(!peripheral.id) {
		return false;
	}
	if(id_filter && peripheral.id.indexOf(id_filter) !== 0) {
		return false;
	}
	if(!name) {
		name = this._default_local_name;
	}
	if(ad.localName) {
		if(ad.localName === name) {
			// Normal Advertising or Sensor Beacon
			return true;
		} else {
			return false;
		}
	} else if(ad.manufacturerData) {
		let manu = ad.manufacturerData;
		if(manu.readUInt16LE(0) === 0x0272 && manu.readUInt8(2) === 0x02 && manu.readUInt8(3) === 0x15) {
			// General Beacon
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
};

/* ------------------------------------------------------------------
* Method: stopScan()
* ---------------------------------------------------------------- */
Alps.prototype.stopScan = function() {
	this.noble.removeAllListeners('discover');
	if(this._discover_status === true) {
		this._discover_status = false;
		this.noble.stopScanning();
	}
};

/* ------------------------------------------------------------------
* Method: startScan([p])
* - p = {
*     name: '' // Full match
*     idFilter: '' // Forward match
*   }
* ---------------------------------------------------------------- */
Alps.prototype.startScan = function(p) {
	this._checkInitialized();
	let name = '';
	let id_filter = '';
	if(p && typeof(p) === 'object') {
		if(('name' in p) && typeof(p['name'] === 'string')) {
			name = p['name'];
		}
		if(('idFilter' in p) && typeof(p['idFilter'] === 'string')) {
			id_filter = p['idFilter'];
		}
	}
	this.noble.on('discover', (peripheral) => {
		if(!this._isAlpsDevice(peripheral, name, id_filter)) {
			return null;
		}
		let acceleration_range = 2;
		let id = peripheral.id;
		if(this._devices[id]) {
			acceleration_range = this._devices[id]['_acceleration_range'];
		}
		let parsed = AlpsAdvertising.parse(peripheral, acceleration_range);
		if(parsed) {
			if(this.onadvertisement && typeof(this.onadvertisement) === 'function') {
				this.onadvertisement(parsed);
			}
		}
	});
	this.noble.startScanning([], true);
	this._discover_status = true;
};

module.exports = Alps;
