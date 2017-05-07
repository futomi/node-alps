/* ------------------------------------------------------------------
* node-alps - advertising.js
* Date: 2017-05-06
* ---------------------------------------------------------------- */
'use strict';

/* ------------------------------------------------------------------
* Constructor: AlpsAdvertising()
* ---------------------------------------------------------------- */
const AlpsAdvertising = function() {};

/* ------------------------------------------------------------------
* Method: parse(peripheral[, acceleration_range])
* ---------------------------------------------------------------- */
AlpsAdvertising.prototype.parse = function(peripheral, acceleration_range) {
	if(!acceleration_range) {
		acceleration_range = 2;
	}
	let ad = peripheral.advertisement;
	let res = {
		id               : peripheral.id,
		uuid             : peripheral.uuid,
		address          : peripheral.address,
		localName        : ad.localName,
		rssi             : peripheral.rssi
	};
	let manu = ad.manufacturerData;
	if(!manu) {
		return res;
	}
	res['companyId'] = manu.slice(1, 2).toString('hex') + manu.slice(0, 1).toString('hex');
	let data_type = manu.readUInt8(2);
	if(data_type === 0x02) { // General Beacon
		let uuid = manu.slice(4, 20).toString('hex').toUpperCase();
		res['uuid'] = [
			uuid.substr(0, 8),
			uuid.substr(8, 4),
			uuid.substr(12, 4),
			uuid.substr(16)
		].join('-');
		res['major'] = manu.readUInt16BE(20);
		res['minor'] = manu.readUInt16BE(22);
	} else if(data_type === 0x00) { // Sensor Beacon
		let div = 4096;
		if(acceleration_range === 4) {
			div = 2048;
		} else if(acceleration_range === 8) {
			div = 1024;
		} else if(acceleration_range === 12) {
			div = 682.7;
		} else if(acceleration_range === 16) {
			div = 512;
		}
		res['acceleration'] = {
			x: manu.readInt16LE(3) / div,  // G
			y: manu.readInt16LE(5) / div,  // G
			z: manu.readInt16LE(7) / div   // G
		};
		if(manu.readUInt16BE(17) === 0x8080) { // Motion Sensors
			res['geoMagnetic'] = {
				x: manu.readInt16LE(9)  * 0.15, // uT
				y: manu.readInt16LE(11) * 0.15, // uT
				z: manu.readInt16LE(13) * 0.15  // uT
			};
			res['pressure'] = manu.readUInt16LE(15) * 860 / 65535 + 250; // hPa
		} else { // Environment Sensors
			res['pressure']     = manu.readUInt16LE(9) * 860 / 65535 + 250; // hPa
			res['humidity']     = (manu.readUInt16LE(11) - 896) / 64;       // %RH
			res['temperature']  = (manu.readUInt16LE(13) - 2096) / 50;      // degC
			res['uv']           = manu.readUInt16LE(15) / (100 * 0.388);    // mW/cm2
			res['ambient']      = manu.readUInt16LE(17) / (0.05 * 0.928);   // Lx
			res['ambientLed']   = manu.readUInt16LE(17) / (0.05 * 0.928 * 0.58); // Lx
			res['ambientFluorescent'] = manu.readUInt16LE(17) / (0.05 * 0.928 * 0.44); // Lx
		}
	}
	return res;
};

module.exports = new AlpsAdvertising();
