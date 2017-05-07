/* ------------------------------------------------------------------
* node-alps - device.js
* Date: 2017-05-06
* ---------------------------------------------------------------- */
'use strict';
const AlpsAdvertising = require('./advertising.js');
const AlpsChars = require('./chars.js');

/* ------------------------------------------------------------------
* Constructor: AlpsDevice(peripheral)
* - peripheral:
*     A Peripheral object of the noble module
* ---------------------------------------------------------------- */
const AlpsDevice = function(noble, peripheral) {
	this.advertisement = AlpsAdvertising.parse(peripheral);
	this.connected = false;

	this.ondisconnect = null;
	this.onnotify = null;

	// Private
	this._wasClean = false;
	this._noble = noble;
	this._peripheral = peripheral;
	this._chars = {
		'custom1': null,
		'custom2': null,
		'custom3': null
	};

	this._response_timeout = 10000; // msec

	this._SERVICE_UUID = '47fe55d8447f43ef9ad9fe6325e17c47';
	this._CHAR_UUID_MAP = {
		'CUSTOM1': '686a9a3b4c2c4231b8719cfe92cc6b1e',
		'CUSTOM2': '078ff5d63c9347f5a30c05563b8d831e',
		'CUSTOM3': 'b962bdd15a77479793a1ede8d0ff74bd'
	};

	this._response_listeners = {
		'custom1': null,
		'custom2': null
	};

	this._acceleration_range = 2;
	this._current_monitor_mode = 0;
	this._sensor_data_buffer = null;
};

/* ------------------------------------------------------------------
* Method: connect()
* ---------------------------------------------------------------- */
AlpsDevice.prototype.connect = function() {
	let promise = new Promise((resolve, reject) => {
		if(this.connected === false) {
			var p = this._peripheral;
			p.once('disconnect', () => {
				this.connected = false;
				if(this._isFunction(this.ondisconnect)) {
					this.ondisconnect({'wasClean': this._wasClean});
					this._wasClean = false;
				}
			});
			p.connect((error) => {
				if(error) {
					reject(new Error('Failed to connect to the device: ' + error.message));
					return;
				}
				this.connected = true;
				this._init().then(() => {
					resolve();
				}).catch((error) => {
					this.disconnect().then(() => {
						reject(new Error('Failed to connect to the device: ' + error.message));
					}).catch((e) => {
						reject(new Error('Failed to connect to the device: ' + error.message));
					});
				});
			});
		} else {
			reject(new Error('The device has been already connected.'));
		}
	});
	return promise;
};

AlpsDevice.prototype._isFunction = function(o) {
	return (o && typeof(o) === 'function') ? true : false;
};

AlpsDevice.prototype._init = function() {
	let promise = new Promise((resolve, reject) => {
		this._discoverChars().then(() => {
			return this._subscribe('custom1');
		}).then(() => {
			return this._subscribe('custom2');
		}).then(() => {
			return this.setDateTime();
		}).then(() => {
			return this.read(0x02);
		}).then((data) => {
			if('accelerationRange' in data) {
				this._acceleration_range = data['accelerationRange'];
			}
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

AlpsDevice.prototype._discoverChars = function() {
	let promise = new Promise((resolve, reject) => {
		let timer = setTimeout(() => {
			reject(new Error('READ TIMEOUT (discoverAllServicesAndCharacteristics)'));
		}, this._response_timeout);

		var p = this._peripheral;
		p.discoverAllServicesAndCharacteristics((error, service_list, char_list) => {
			if(error) {
				if(timer) {
					clearTimeout(timer);
				}
				reject(error);
				return;
			}
			let service_uuid_list = [];
			service_list.forEach((s) => {
				service_uuid_list.push(s.uuid);
			});
			if(service_uuid_list.indexOf(this._SERVICE_UUID) === -1) {
				if(timer) {
					clearTimeout(timer);
				}
				reject(new Error('The device seems to be a ALPS Sensor Network Module.'));
				return;
			}
			char_list.forEach((c) => {
				if(c.uuid === this._CHAR_UUID_MAP['CUSTOM1']) {
					this._chars['custom1'] = c;
				} else if(c.uuid === this._CHAR_UUID_MAP['CUSTOM2']) {
					this._chars['custom2'] = c;
				} else if(c.uuid === this._CHAR_UUID_MAP['CUSTOM3']) {
					this._chars['custom3'] = c;
				}
			});
			if(!(this._chars['custom1'] && this._chars['custom2'] && this._chars['custom3'])) {
				if(timer) {
					clearTimeout(timer);
				}
				reject(new Error('The device seems to be a ALPS Sensor Network Module.'));
				return;
			}
			if(timer) {
				clearTimeout(timer);
			}
			return resolve();
		});
	});
	return promise;
};

AlpsDevice.prototype._subscribe = function(char_name) {
	let promise = new Promise((resolve, reject) => {
		let char = this._chars[char_name];
		char.subscribe((error) => {
			if(error) {
				reject(error);
				return;
			}
			char.on('data', (buf) => {
				let code = buf.readUInt8(0);
				if(code === 0xF2 || code === 0xF3) {
					let f = this.onnotify;
					if(this._isFunction(f)) {
						let data = AlpsChars.parse(buf, this._acceleration_range);
						if(data) {
							if(this._current_monitor_mode === 0) {
								if(this._sensor_data_buffer) {
									let b = this._sensor_data_buffer;
									if(b['dataIndex'] === data['dataIndex']) {
										for(let k in b['timeStamp']) {
											data['timeStamp'][k] = b['timeStamp'][k];
										}
										f(data);
										this._sensor_data_buffer = null;
									} else {
										this._sensor_data_buffer = data;
									}
								} else {
									this._sensor_data_buffer = data;
								}
							} else {
								f(data);
							}
						}
					}
				} else {
					let f = this._response_listeners[char_name];
					if(this._isFunction(f)) {
						f(buf);
					}
				}
			});
			resolve();
		});
	});
	return promise;
};

AlpsDevice.prototype._unsubscribe = function(char_name) {
	let promise = new Promise((resolve, reject) => {
		let char = this._chars[char_name];
		char.unsubscribe((error) => {
			if(error) {
				reject(error);
			} else {
				char.removeAllListeners('data');
				this._response_listeners['custom1'] = null;
				this._response_listeners['custom2'] = null;
				resolve();
			}
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: disconnect()
* ---------------------------------------------------------------- */
AlpsDevice.prototype.disconnect = function() {
	let promise = new Promise((resolve, reject) => {
		if(this.connected !== true) {
			resolve();
			return;
		};
		var p = this._peripheral;
		this._wasClean = true;
		this._unsubscribe('custom1').then(() => {
			return this._unsubscribe('custom2');
		}).then(() => {
			p.disconnect((error) => {
				if(error) {
					reject(new Error('Failed to disconnect the device: ' + error.message));
					return;
				}
				this._chars['custom1'] = null;
				this._chars['custom2'] = null;
				this._chars['custom3'] = null;
				this.connected = false;
				resolve();
			});
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: read(event_code)
* ---------------------------------------------------------------- */
AlpsDevice.prototype.read = function(event_code) {
	let promise = new Promise((resolve, reject) => {
		let res = AlpsChars.createForRead(event_code);
		if(res['error']) {
			reject(error);
			return;
		}

		let timer = setTimeout(() => {
			this._response_listeners['custom1'] = null;
			this._response_listeners['custom2'] = null;
			reject(new Error('READ TIMEOUT (0x' + Buffer.from([event_code]).toString('hex') + ')'));
		}, this._response_timeout);

		this._response_listeners['custom1'] = (buf) => {
			clearTimeout(timer);
			let data = AlpsChars.parse(buf);
			if(data) {
				if(data['ack'] === 2) {
					reject(new Error('Request denied.'));
				}
			}
		};

		this._response_listeners['custom2'] = (buf) => {
			clearTimeout(timer);
			let data = AlpsChars.parse(buf);
			if(data) {
				resolve(data);
			} else {
				reject(new Error('Unknown response'));
			}
		};

		this._chars['custom3'].write(res['buffer'], true, (error) => {
			if(error) {
				this._response_listeners['custom2'] = null;
				reject(error);
			}
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: write(event_code, params)
* ---------------------------------------------------------------- */
AlpsDevice.prototype.write = function(event_code, params) {
	let promise = new Promise((resolve, reject) => {
		let res = AlpsChars.create(event_code, params);
		if(res['error']) {
			reject(res['error']);
			return;
		}

		let timer = null;
		let cancelReceiveState = () => {
			if(timer) {
				clearTimeout(timer);
			}
			this._response_listeners['custom1'] = null;
			this._response_listeners['custom2'] = null;
		};
	
		timer = setTimeout(() => {
			cancelReceiveState();
			reject(new Error('WRITE TIMEOUT (0x' + Buffer.from([event_code]).toString('hex') + ')'));
		}, this._response_timeout);

		this._response_listeners['custom1'] = (buf) => {
			cancelReceiveState();
			let data = AlpsChars.parse(buf);
			if(data) {
				if(data['ack'] === 1) {
					resolve(data);
				} else if(data['ack'] === 2) {
					reject(new Error('Request denied.'));
				} else {
					console.log(JSON.stringify(data, null, '  '));
				}
			} else {
				console.log(buf);
			}
		};

		this._response_listeners['custom2'] = (buf) => {
			cancelReceiveState();
			let data = AlpsChars.parse(buf);
			if(data) {
				resolve(data);
			} else {
				reject(new Error('Unknown response'));
			}
		};

		this._chars['custom3'].write(res['buffer'], true, (error) => {
			if(error) {
				cancelReceiveState();
				reject(error);
			}
		});

	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: setBeaconMode(params)
*
* - Normal Advertising
*   - params: {
*       mode: 0,
*       interval: 100 // msec (30 - 10000)
*     }
*
* - Sensor Beacon
*   - params: {
*       mode: 1,
*       format: 0, // 0: environment sensors, 1: motion sensors
*       accelerationRange: 2, // 2, 4, 8, 12, 16
*       interval: 100 // msec (30 - 10000)
*     }
*
* - General Beacon (iBeacon-like Beacon)
*   - params: {
*       mode: 2,
*       uuid: '00000000-0000-0000-0000000000000000',
*       major: 0x0000,
*       minor: 0x0000
*     }
* ---------------------------------------------------------------- */
AlpsDevice.prototype.setBeaconMode = function(params) {
	let p = {
		mode: 0,
		format: 0,
		interval: 100,
		accelerationRange: this._acceleration_range,
		uuid: '00000000-0000-0000-0000000000000000',
		major: 0x0000,
		minor: 0x0000
	};
	let promise = new Promise((resolve, reject) => {
		if(params && typeof(params) !== 'object') {
			reject(new Error('Invalid parameter.'));
			retrun;
		}
		if('mode' in params) {
			let v = params['mode'];
			if(typeof(v) === 'number' && v.toString().match(/^(0|1|2)$/)) {
				p['mode'] = v;
			} else {
				reject(new Error('The parameter `mode` is invalid.'));
				retrun;
			}
		}

		if(p['mode'] === 0) { // Normal Advertising
			if('interval' in params) {
				let v = params['interval'];
				if(typeof(v) === 'number' && v % 1 === 0 && v >= 30 && v <= 10000) {
					p['interval'] = v;
				} else {
					reject(new Error('The parameter `interval` is invalid.'));
					retrun;
				}
			}
			this._setBeaconModeNormal(p).then(() => {
				resolve();
			}).catch((error) => {
				reject(error);
			});
		} else if(p['mode'] === 1) { // Sensor Beacon
			if('format' in params) {
				let v = params['format'];
				if(typeof(v) === 'number' && v.toString().match(/^(0|1)$/)) {
					p['format'] = v;
				} else {
					reject(new Error('The parameter `format` is invalid.'));
					retrun;
				}
			}
			if('accelerationRange' in params) {
				let v = params['accelerationRange'];
				if(typeof(v) === 'number' && v.toString().match(/^(2|4|8|12|16)$/)) {
					p['accelerationRange'] = v;
				} else {
					reject(new Error('The parameter `accelerationRange` is invalid.'));
					retrun;
				}
			}
			if('interval' in params) {
				let v = params['interval'];
				if(typeof(v) === 'number' && v % 1 === 0 && v >= 30 && v <= 10000) {
					p['interval'] = v;
				} else {
					reject(new Error('The parameter `interval` is invalid.'));
					retrun;
				}
			}
			this._setBeaconModeSensor(p).then(() => {
				resolve();
			}).catch((error) => {
				reject(error);
			});
		} else if(p['mode'] === 2) { // General Beacon (iBeacon-like Beacon)
			
			if('uuid' in params) {
				let v = params['uuid'];
				if(typeof(v) === 'string') {
					v = v.replace(/\-/g, '').toLowerCase();
					if(v.match(/^[a-f0-9]{32}$/)) {
						p['uuid'] = v;
					} else {
						reject(new Error('The parameter `uuid` is invalid.'));
						retrun;
					}
				} else {
					reject(new Error('The parameter `format` is invalid.'));
					retrun;
				}
			}
			if('major' in params) {
				let v = params['major'];
				if(typeof(v) === 'number' && v % 1 === 0 && v >= 0x0000 && v <= 0xFFFF) {
					p['major'] = v;
				} else {
					reject(new Error('The parameter `major` is invalid.'));
					retrun;
				}
			}
			if('minor' in params) {
				let v = params['minor'];
				if(typeof(v) === 'number' && v % 1 === 0 && v >= 0x0000 && v <= 0xFFFF) {
					p['minor'] = v;
				} else {
					reject(new Error('The parameter `minor` is invalid.'));
					retrun;
				}
			}
			this._setBeaconModeGeneral(p).then(() => {
				resolve();
			}).catch((error) => {
				reject(error);
			});
		}
	});
	return promise;
};

AlpsDevice.prototype._setBeaconModeNormal = function(p) {
	let promise = new Promise((resolve, reject) => {
		this.write(0x16, {
			beaconFormat: 0,
			beaconMode: 0,
			beaconMajor: 0,
			beaconMinor: 0
		}).then(() => {
			return this.write(0x12, {
				advInterval: p['interval'],
				advDuration: 0
			});
		}).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

AlpsDevice.prototype._setBeaconModeSensor = function(p) {
	let promise = new Promise((resolve, reject) => {
		this.write(0x16, {
			beaconFormat: p['format'],
			beaconMode: 1,
			beaconMajor: 0,
			beaconMinor: 0
		}).then(() => {
			return this.write(0x02, {
				accelerationRange: p['accelerationRange']
			});
		}).then(() => {
			this._acceleration_range = p['accelerationRange'];
			return this.write(0x12, {
				advInterval: p['interval'],
				advDuration: 0
			});
		}).then(() => {
			return this.write(0x01, {
				acceleration : true,
				magnetic     : p['format'] ? true : false,
				pressure     : true,
				humidity     : p['format'] ? false : true,
				temperature  : p['format'] ? false : true,
				uv           : p['format'] ? false : true,
				light        : p['format'] ? false : true
			});
		}).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

AlpsDevice.prototype._setBeaconModeGeneral = function(p) {
	let promise = new Promise((resolve, reject) => {
		this.write(0x16, {
			beaconFormat: 0,
			beaconMode: 2,
			beaconMajor: p['major'],
			beaconMinor: p['minor'] 
		}).then(() => {
			return this.write(0x17, {
				beaconUuid: p['uuid']
			});
		}).then(() => {
			return this.write(0x12, {
				advInterval: 1000,
				advDuration: 0
			});
		}).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: initSettings()
* ---------------------------------------------------------------- */
AlpsDevice.prototype.initSettings = function() {
	let promise = new Promise((resolve, reject) => {
		this.write(0x2F, {
			save: false,
			initialize: true
		}).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: seveSettings()
* ---------------------------------------------------------------- */
AlpsDevice.prototype.saveSettings = function() {
	let promise = new Promise((resolve, reject) => {
		this.write(0x2F, {
			save: true,
			initialize: false
		}).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: setDateTime()
* ---------------------------------------------------------------- */
AlpsDevice.prototype.setDateTime = function() {
	let promise = new Promise((resolve, reject) => {
		let dt = new Date();
		this.write(0x30, {
			millisecond : dt.getMilliseconds(),
			second      : dt.getSeconds(),
			minute      : dt.getMinutes(),
			hour        : dt.getHours(),
			day         : dt.getDate(),
			month       : dt.getMonth() + 1,
			year        : dt.getFullYear()
		}).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: getDateTime()
* ---------------------------------------------------------------- */
AlpsDevice.prototype.getDateTime = function() {
	let promise = new Promise((resolve, reject) => {
		this.read(0x30).then((data) => {
			resolve(data);
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: startMonitor([params])
*
* - Environment Sensors Mode (Default)
*   - params: {
*       mode: 0,
*       interval: 1, // 1-65535 (sec)
*     }
*
* - Motion Sensors Mode
*   - params: {
*       mode: 1,
*       interval: 200, // 10-999 (msec)
*       accelerationRange: 2, // 2, 4, 8, 12, 16
*     }
* ---------------------------------------------------------------- */
AlpsDevice.prototype.startMonitor = function(params) {
	let promise = new Promise((resolve, reject) => {
		let p = {
			mode: 0,
			interval: 1,
			accelerationRange: 2
		};
		if('mode' in params) {
			let v = params['mode'];
			if(typeof(v) === 'number' && v.toString().match(/^(0|1)$/)) {
				p['mode'] = v;
			} else {
				reject(new Error('The parameter `mode` must be 0 or 1.'));
			}
		}
		if(p['mode'] === 0) { // Environment Sensors Mode
			if('interval' in params) {
				let v = params['interval'];
				if(typeof(v) === 'number' && v % 1 === 0 && v >= 1 && v <= 65535) {
					p['interval'] = v;
				} else {
					reject(new Error('The parameter `interval` must be an integer in the range of 1 to 65535.'));
				}
			} else {
				p['interval'] = 1;
			}
			this._startMonitorEnvironment(p).then(() => {
				resolve();
			}).catch((error) => {
				reject(error);
			});
		} else if(p['mode'] === 1) { // Motion Sensors Mode
			if('interval' in params) {
				let v = params['interval'];
				if(typeof(v) === 'number' && v % 1 === 0 && v >= 10 && v <= 999) {
					p['interval'] = v;
				} else {
					reject(new Error('The parameter `interval` must be an integer in the range of 10 to 999.'));
				}
			} else {
				p['interval'] = 200;
			}
			if('accelerationRange' in params) {
				let v = params['accelerationRange'];
				if(typeof(v) === 'number' && v.toString().match(/^(2|4|8|12|16)$/)) {
					p['accelerationRange'] = v;
				} else {
					reject(new Error('The parameter `accelerationRange` is invalid.'));
					retrun;
				}
			} else {
				p['accelerationRange'] = this._acceleration_range;
			}
			this._startMonitorMotion(p).then(() => {
				resolve();
			}).catch((error) => {
				reject(error);
			});
		}

	});
	return promise;
};

AlpsDevice.prototype._startMonitorEnvironment = function(p) {
	let promise = new Promise((resolve, reject) => {
		this.write(0x01, {
			acceleration : false,
			magnetic     : false,
			pressure     : true,
			humidity     : true,
			temperature  : true,
			uv           : true,
			light        : true
		}).then(() => {
			return this.write(0x04, {
				mode: 0
			});
		}).then(() => {
			return this.write(0x05, {
				interval: p['interval']
			});
		}).then(() => {
			return this.write(0x20, {
				active: true
			});
		}).then(() => {
			this._current_monitor_mode = 0;
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

AlpsDevice.prototype._startMonitorMotion = function(p) {
	let promise = new Promise((resolve, reject) => {
		this.write(0x01, {
			acceleration : true,
			magnetic     : true,
			pressure     : false,
			humidity     : false,
			temperature  : false,
			uv           : false,
			light        : false
		}).then(() => {
			return this.write(0x02, {
				accelerationRange: p['accelerationRange']
			});
		}).then(() => {
			this._acceleration_range = p['accelerationRange'];
			return this.write(0x04, {
				mode: 1
			});
		}).then(() => {
			return this.write(0x06, {
				interval: p['interval']
			});
		}).then(() => {
			return this.write(0x20, {
				active: true
			});
		}).then(() => {
			this._current_monitor_mode = 1;
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: stopMonitor()
* ---------------------------------------------------------------- */
AlpsDevice.prototype.stopMonitor = function() {
	let promise = new Promise((resolve, reject) => {
		this.write(0x20, {
			active: false
		}).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

module.exports = AlpsDevice;
