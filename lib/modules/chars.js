/* ------------------------------------------------------------------
* node-alps - chars.js
* Date: 2017-05-06
* ---------------------------------------------------------------- */
'use strict';

/* ------------------------------------------------------------------
* Constructor: AlpsChars()
* ---------------------------------------------------------------- */
const AlpsChars = function() {
	// Private
	this._PACKET_LENGTH_MAP = {
		// 対向機側からのコマンド（1/3） センシング設定
		'01': 0x03, // サンプリングデバイス選択
		'02': 0x03, // Acceleration レンジ設定
		'03': 0x07, // データ変換時間 （Acceleration） 設定
		'04': 0x03, // 計測モード設定
		'05': 0x04, // Slow モード間隔設定
		'06': 0x04, // Fast モード間隔設定
		// 対向機側からのコマンド（2/3） Bluetooth 設定
		'10': 0x04, // Bluetooth 動作設定
		'11': 0x0A, // Bluetooth 通信設定
		'12': 0x06, // ADV 間隔設定
		'13': 0x08, // 間欠 ADV 設定
		'14': 0x04, // タイマスリープ復帰
		'15': 0x14, // デバイス名称
		'16': 0x07, // Beacon 動作
		'17': 0x12, // General Beacon UUID設定
		// 対向機側からのコマンド（3/3） 動作指示 / システム
		'20': 0x03, // 計測制御
		'21': 0x03, // Bluetooth 通信動作設定
		'22': 0x03, // スリープ設定
		'23': 0x03, // Data Up Disable
		'24': 0x03, // 自動 Status 発行機能
		'29': 0x03, // エラー解除
		'2D': 0x03, // 接続パラメータ更新状況 通知リクエスト
		'2E': 0x03, // ステータス・リクエスト
		'2F': 0x03, // 設定内容の保存／初期化
		'30': 0x0A, // 現在時刻
		'31': 0x03  // HW 異常検知
	};
};

/* ------------------------------------------------------------------
* Method: parse(buf[, range])
* ---------------------------------------------------------------- */
AlpsChars.prototype.parse = function(buf, range) {
	if(!buf || buf.length < 3) {
		return null;
	}
	let code = buf.readUInt8(0);
	/* ----------------------------------------------------
	* Custom2 notifications
	* -------------------------------------------------- */
	// 対向機側からのコマンド（1/3） センシング設定
	if(code === 0x01) {
		//サンプリングデバイス選択 (0x01)
		return this._parse01(buf);
	} else if(code === 0x02) {
		// Acceleration レンジ設定 (0x02)
		return this._parse02(buf);
	} else if(code === 0x03) {
		// データ変換時間（Acceleration）設定 (0x03)
		return this._parse03(buf);
	} else if(code === 0x04) {
		// 計測モード設定 (0x04)
		return this._parse04(buf);
	} else if(code === 0x05) {
		// Slowモード間隔設定 (0x05)
		return this._parse05(buf);
	} else if(code === 0x06) {
		// Fastモード間隔設定 (0x06)
		return this._parse06(buf);
	// 対向機側からのコマンド（2/3） Bluetooth 設定
	} else if(code === 0x10) {
		// Bluetooth 動作設定 (0x10)
		return this._parse10(buf);
	} else if(code === 0x11) {
		// Bluetooth 動作設定 (0x11)
		return this._parse11(buf);
	} else if(code === 0x12) {
		// ADV 間隔設定 (0x12)
		return this._parse12(buf);
	} else if(code === 0x13) {
		// 間欠 ADV 設定 (0x13)
		return this._parse13(buf);
	} else if(code === 0x14) {
		// タイマスリープ復帰 (0x14)
		return this._parse14(buf);
	} else if(code === 0x15) {
		// デバイス名称 (0x15)
		return this._parse15(buf);
	} else if(code === 0x16) {
		// Beacon 動作 (0x16)
		return this._parse16(buf);
	} else if(code === 0x17) {
		// General Beacon UUID設定 (0x17)
		return this._parse17(buf);
	// 対向機側からのコマンド（3/3） 動作指示 / システム
	} else if(code === 0x20) {
		// 計測制御 (0x20)
		return this._parse20(buf);
	} else if(code === 0x21) {
		// Bluetooth 通信動作設定 (0x21)
		return this._parse21(buf);
	} else if(code === 0x22) {
		// スリープ設定 (0x22)
		return this._parse22(buf);
	} else if(code === 0x23) {
		// Data Up Disable (0x23)
		return this._parse23(buf);
	} else if(code === 0x24) {
		// 自動 Status 発行機能 (0x24)
		return this._parse24(buf);
	} else if(code === 0x2D) {
		//接続パラメータ更新状況 通知リクエスト (0x2D)
		return this._parse2D(buf);
	} else if(code === 0x30) {
		// 時刻設定 (0x30)
		return this._parse30(buf);
	} else if(code === 0x31) {
		// HW 異常検知 (0x31)
		return this._parse31(buf);
	} else if(code === 0x81) {
		// 接続パラメータ更新状況通知 (0x81)
		return this._parse81(buf);
	/* ----------------------------------------------------
	* Custom1 notifications
	* -------------------------------------------------- */
	} else if(code === 0xF2) {
		// データパケット1 (0xF2)
		return this._parseF2(buf, range);
	} else if(code === 0xF3) {
		// データパケット2 (0xF3)
		return this._parseF3(buf);
	} else if(code === 0xE0) {
		// ステータス通知 (0xE0)
		return this._parseE0(buf);
	} else {
		console.log(buf);
		return null;
	}
};

/* ------------------------------------------------------------------
* Method: createForRead(event_code)
* ---------------------------------------------------------------- */
AlpsChars.prototype.createForRead = function(event_code) {
	let res = {};
	let c = Buffer.from([event_code]).toString('hex').toUpperCase();
	if(!(c in this._PACKET_LENGTH_MAP)) {
		return {error: new Error('Unknown event code')};
	}
	let len = this._PACKET_LENGTH_MAP[c];
	let buf = Buffer.alloc(len);
	buf.writeUInt8(event_code + 0x80, 0);
	buf.writeUInt8(len, 1);
	for(let i=2; i<len; i++) {
		buf.writeUInt8(0x00, i);
	}
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* Method: create(event_code, params)
* ---------------------------------------------------------------- */
AlpsChars.prototype.create = function(code, params) {
	let res = {};
	// 対向機側からのコマンド（1/3） センシング設定
	if(code === 0x01) {
		// サンプリングデバイス選択
		res = this._create01(params);
	} else if(code === 0x02) {
		// Acceleration レンジ設定 (0x02)
		return this._create02(params);
	} else if(code === 0x03) {
		// データ変換時間（Acceleration）設定 (0x03)
		return this._create03(params);
	} else if(code === 0x04) {
		// 計測モード設定 (0x04)
		return this._create04(params);
	} else if(code === 0x05) {
		// Slowモード間隔設定 (0x05)
		return this._create05(params);
	} else if(code === 0x06) {
		// Fastモード間隔設定 (0x06)
		return this._create06(params);
	// 対向機側からのコマンド（2/3） Bluetooth 設定
	} else if(code === 0x10) {
		// Bluetooth 動作設定 (0x10)
		return this._create10(params);
	} else if(code === 0x11) {
		// Bluetooth 動作設定 (0x11)
		return this._create11(params);
	} else if(code === 0x12) {
		// ADV 間隔設定 (0x12)
		return this._create12(params);
	} else if(code === 0x13) {
		// 間欠 ADV 設定 (0x13)
		return this._create13(params);
	} else if(code === 0x14) {
		// タイマスリープ復帰 (0x14)
		return this._create14(params);
	} else if(code === 0x15) {
		// デバイス名称 (0x15)
		return this._create15(params);
	} else if(code === 0x16) {
		// Beacon 動作 (0x16)
		return this._create16(params);
	} else if(code === 0x17) {
		// General Beacon UUID設定 (0x17)
		return this._create17(params);
	// 対向機側からのコマンド（3/3） 動作指示 / システム
	} else if(code === 0x20) {
		// 計測制御 (0x20)
		return this._create20(params);
	} else if(code === 0x21) {
		// Bluetooth 通信動作設定 (0x21)
		return this._create21(params);
	} else if(code === 0x22) {
		// スリープ設定 (0x22)
		return this._create22(params);
	} else if(code === 0x23) {
		// Data Up Disable (0x23)
		return this._create23(params);
	} else if(code === 0x24) {
		// 自動 Status 発行機能 (0x24)
		return this._create24(params);
	} else if(code === 0x29) {
		// エラー解除 (0x29)
		return this._create29(params);
	} else if(code === 0x2D) {
		// 接続パラメータ更新状況 通知リクエスト (0x2D)
		return this._create2D(params);
	} else if(code === 0x2E) {
		// ステータス・リクエスト (0x2E)
		return this._create2E(params);
	} else if(code === 0x2F) {
		// 設定内容の保存／初期化 (0x2F)
		return this._create2F(params);
	} else if(code === 0x30) {
		// 時刻設定 (0x30)
		return this._create30(params);
	} else if(code === 0x31) {
		// HW 異常検知 (0x31)
		return this._create31(params);
	} else {
		res = {error: new Error('Unknown event code')}
	}
	return res;
};

/* ------------------------------------------------------------------
* サンプリングデバイス選択 (0x01)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse01 = function(buf) {
	if(buf.length !== 3) {
		return null;
	}
	let n = buf.readUInt8(2);
	return {
		'acceleration' : (n & 0b00000001) ? true : false,
		'magnetic'     : (n & 0b00000010) ? true : false,
		'pressure'     : (n & 0b00000100) ? true : false,
		'humidity'     : (n & 0b00001000) ? true : false,
		'temperature'  : (n & 0b00010000) ? true : false,
		'uv'           : (n & 0b00100000) ? true : false,
		'light'        : (n & 0b01000000) ? true : false,
	};
};

AlpsChars.prototype._create01 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}
	let n = 0;
	[
		'acceleration',
		'magnetic',
		'pressure',
		'humidity',
		'temperature',
		'uv',
		'light'
	].forEach((k, i) => {
		if(params[k] === true) {
			n = n | (1 << i);
		}
	});
	let buf = Buffer.from([0x01, 0x03, n]);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* Acceleration レンジ設定 (0x02)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse02 = function(buf) {
	if(buf.length !== 3) {
		return null;
	}
	let n = buf.readUInt8(2) & 0b00000111;
	let range = 0;
	if(n === 0b000) {
		range = 2;
	} else if(n === 0b001) {
		range = 4;
	} else if(n === 0b010) {
		range = 8;
	} else if(n === 0b011) {
		range = 12;
	} else if(n === 0b100) {
		range = 16;
	}
	return {
		accelerationRange: range
	};
};

AlpsChars.prototype._create02 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}
	let range = params['accelerationRange'];
	let n = 0b000;
	if(range === 2) {
		n = 0b000;
	} else if(range === 4) {
		n = 0b001;
	} else if(range === 8) {
		n = 0b010;
	} else if(range === 12) {
		n = 0b011;
	} else if(range === 16) {
		n = 0b100;
	} else {
		return {error: new Error('The `range` must be any one of 2, 4, 8, 12, 16.')};
	}
	let buf = Buffer.from([0x02, 0x03, n]);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* データ変換時間（Acceleration）設定 (0x03)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse03 = function(buf) {
	if(buf.length !== 7) {
		return null;
	}

	// データ変換時間設定(加速度)
	let n1 = buf.readUInt8(2) & 0b00001111;
	let freq = 1;
	if(n1 === 0b0000) {
		freq = 1;
	} else if(n1 === 0b0001) {
		freq = 2;
	} else if(n1 === 0b0010) {
		freq = 4;
	} else if(n1 === 0b0011) {
		freq = 8;
	} else if(n1 === 0b0100) {
		freq = 16;
	} else if(n1 === 0b0101) {
		freq = 32;
	} else if(n1 === 0b0110) {
		freq = 64;
	} else if(n1 === 0b0111) {
		freq = 128;
	} else if(n1 === 0b1000) {
		freq = 256;
	} else if(n1 === 0b1001) {
		freq = 0.25
	} else if(n1 === 0b1010) {
		freq = 0.5
	}

	// 割り込み軸設定
	let n2 = buf.readUInt8(3);
	let axis = {
		polarZ: (n2 & 0b01000000) ? false : true, // Z軸極性 true:＋方向, false:－方向
		polarY: (n2 & 0b00100000) ? false : true, // Y軸極性 true:＋方向, false:－方向
		polarX: (n2 & 0b00010000) ? false : true, // X軸極性 true:＋方向, false:－方向
		intZ  : (n2 & 0b00000100) ? true : false, // Z軸割り込み true:有効, false:無効 
		intY  : (n2 & 0b00000010) ? true : false, // Y軸割り込み true:有効, false:無効
		intX  : (n2 & 0b00000001) ? true : false  // X軸割り込み true:有効, false:無効
	};

	// 割り込み閾値設定
	let threshold = buf.readUInt8(4);

	return {
		frequency: freq, // Hz
		axis: axis,
		threshold: threshold
	};
};

AlpsChars.prototype._create03 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	// データ変換時間設定(加速度)
	let d1 = 0b0110; // 64Hz
	if(params['frequency'] === 1) {
		d1 = 0b0000;
	} else if(params['frequency'] === 2) {
		d1 = 0b0001;
	} else if(params['frequency'] === 4) {
		d1 = 0b0010;
	} else if(params['frequency'] === 8) {
		d1 = 0b0011;
	} else if(params['frequency'] === 16) {
		d1 = 0b0100;
	} else if(params['frequency'] === 32) {
		d1 = 0b0101;
	} else if(params['frequency'] === 64) {
		d1 = 0b0110;
	} else if(params['frequency'] === 128) {
		d1 = 0b0111;
	} else if(params['frequency'] === 256) {
		d1 = 0b1000;
	} else if(params['frequency'] === 0.25) {
		d1 = 0b1001;
	} else if(params['frequency'] === 0.5) {
		d1 = 0b1010;
	} else {
		return {error: new Error('The `freqency` must be any one of 2, 4, 8, 16, 32, 64, 128, 256, 0.25, 0.5.')};
	}

	// 割り込み軸設定
	let axis = params['axis'];
	if(!axis || typeof(axis) !== 'object') {
		return {error: new Error('The `axis` is invalid.')};
	}

	let d2 = 0;

	let pz = axis['polarZ'];
	if(typeof(pz) === 'boolean') {
		if(pz === false) {
			d2 = d2 | 0b01000000;
		}
	} else {
		return {error: new Error('The `axis.polarZ` must be Boolean.')};
	}

	let py = axis['polarY'];
	if(typeof(py) === 'boolean') {
		if(py === false) {
			d2 = d2 | 0b00100000;
		}
	} else {
		return {error: new Error('The `axis.polarY` must be Boolean.')};
	}

	let px = axis['polarX'];
	if(typeof(px) === 'boolean') {
		if(px === false) {
			d2 = d2 | 0b00010000;
		}
	} else {
		return {error: new Error('The `axis.polarX` must be Boolean.')};
	}

	let iz = axis['intZ'];
	if(typeof(iz) === 'boolean') {
		if(iz === true) {
			d2 = d2 | 0b00000100;
		}
	} else {
		return {error: new Error('The `axis.intZ` must be Boolean.')};
	}

	let iy = axis['intY'];
	if(typeof(iy) === 'boolean') {
		if(iy === true) {
			d2 = d2 | 0b00000010;
		}
	} else {
		return {error: new Error('The `axis.intY` must be Boolean.')};
	}

	let ix = axis['intX'];
	if(typeof(ix) === 'boolean') {
		if(ix === true) {
			d2 = d2 | 0b00000001;
		}
	} else {
		return {error: new Error('The `axis.intX` must be Boolean.')};
	}

	// 割り込み閾値設定
	let threshold = params['threshold'];
	if(typeof(threshold) !== 'number' || threshold % 1 > 0 || threshold < 0x00 || threshold > 0xFF) {
		return {error: new Error('The `threshold` must be an integer in range of 0 to 255.')};
	}
	let d3 = threshold;

	let buf = Buffer.from([0x03, 0x07, d1, d2, d3, 0x00, 0x00]);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* 計測モード設定 (0x04)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse04 = function(buf) {
	if(buf.length !== 3) {
		return null;
	}
	// 0: Slow, 1: Fast, 3: Force, 4: Hybrid, Others: Slow
	let mode = buf.readUInt8(2) & 0b00000111;
	if(mode > 4) {
		mode = 0;
	}
	return {
		mode: mode
	};
};

AlpsChars.prototype._create04 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}
	let mode = params['mode'];
	if(typeof(mode) !== 'number' || !mode.toString().match(/^(0|1|3|4)$/)) {
		return {error: new Error('The `mode` must be any one of 0, 1, 3, 4.')};
	}
	let buf = Buffer.from([0x04, 0x03, mode]);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* Slowモード間隔設定 (0x05)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse05 = function(buf) {
	if(buf.length !== 4) {
		return null;
	}
	return {
		interval: buf.readUInt16LE(2) // sec
	};
};

AlpsChars.prototype._create05 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}
	let interval = params['interval'];
	if(typeof(interval) !== 'number' || interval % 1 > 0 || interval < 1 || interval > 65535) {
		return {error: new Error('The `interval` must be an integer in the range of 1 to 65535.')};
	}

	let buf = Buffer.alloc(4);
	buf.writeUInt8(0x05, 0);
	buf.writeUInt8(0x04, 1);
	buf.writeUInt16LE(interval, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* Fastモード間隔設定 (0x06)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse06 = function(buf) {
	if(buf.length !== 4) {
		return null;
	}
	return {
		interval: buf.readUInt16LE(2) // msec
	};
};

AlpsChars.prototype._create06 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}
	let interval = params['interval'];
	if(typeof(interval) !== 'number' || interval % 1 > 0 || interval < 10 || interval > 999) {
		return {error: new Error('The `interval` must be an integer in the range of 10 to 999.')};
	}

	let buf = Buffer.alloc(4);
	buf.writeUInt8(0x06, 0);
	buf.writeUInt8(0x04, 1);
	buf.writeUInt16LE(interval, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* Bluetooth 動作設定 (0x10)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse10 = function(buf) {
	if(buf.length !== 4) {
		return null;
	}
	return {
		offTimer: buf.readUInt16LE(2) // 電源 OFF 時間設定 (min)
	};
};

AlpsChars.prototype._create10 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}
	let offTimer = params['offTimer'];
	if(typeof(offTimer) !== 'number' || offTimer % 1 > 0 || offTimer < 10 || offTimer > 65535) {
		return {error: new Error('The `offTimer` must be an integer in the range of 10 to 65535.')};
	}

	let buf = Buffer.alloc(4);
	buf.writeUInt8(0x10, 0);
	buf.writeUInt8(0x04, 1);
	buf.writeUInt16LE(offTimer, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* Bluetooth 動作設定 (0x11)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse11 = function(buf) {
	if(buf.length !== 0x0A) {
		return null;
	}
	return {
		connectionIntervalMax : buf.readUInt16LE(2) * 1.25, // Connection Interval Max (msec)
		connectionIntervalMin : buf.readUInt16LE(4) * 1.25, // Connection Interval Min (msec)
		slaveLatency          : buf.readUInt16LE(6),        // Slave Latency
		supervisionTimeout    : buf.readUInt16LE(8) * 10    // Supervision Timeout (msec)
	};
};

AlpsChars.prototype._create11 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	let buf = Buffer.alloc(0x0A);
	buf.writeUInt8(0x11, 0);
	buf.writeUInt8(0x0A, 1);

	if('connectionIntervalMax' in params) {
		let v = params['connectionIntervalMax'];
		if(typeof(v) !== 'number' || v < 7.5 || v > 4000) {
			return {error: new Error('The `connectionIntervalMax` must be a number in the range of 7.5 to 4000.')};
		}
		buf.writeUInt16LE(parseInt(v / 1.25, 10), 2);
	} else {
		return {error: new Error('The `connectionIntervalMax` is required.')};
	}

	if('connectionIntervalMin' in params) {
		let v = params['connectionIntervalMin'];
		if(typeof(v) !== 'number' || v < 7.5 || v > 4000) {
			return {error: new Error('The `connectionIntervalMin` must be a number in the range of 7.5 to 4000.')};
		}
		if(v >= params['connectionIntervalMax']) {
			return {error: new Error('The `connectionIntervalMin` must be less than the `connectionIntervalMax`.')};
		}
		buf.writeUInt16LE(parseInt(v / 1.25, 10), 4);
	} else {
		return {error: new Error('The `connectionIntervalMin` is required.')};
	}

	if('slaveLatency' in params) {
		let v = params['slaveLatency'];
		if(typeof(v) !== 'number' || v % 1 > 0 || v < 0 || v > 499) {
			return {error: new Error('The `slaveLatency` must be an integer in the range of 0 to 499.')};
		}
		buf.writeUInt16LE(v, 6);
	} else {
		return {error: new Error('The `slaveLatency` is required.')};
	}

	if('supervisionTimeout' in params) {
		let v = params['supervisionTimeout'];
		if(typeof(v) !== 'number' || v % 1 > 0 || v < 100 || v > 32000) {
			return {error: new Error('The `supervisionTimeout` must be an integer in the range of 100 to 32000.')};
		}
		buf.writeUInt16LE(parseInt(v / 10, 10), 8);
	} else {
		return {error: new Error('The `supervisionTimeout` is required.')};
	}

	return {buffer: buf};
};

/* ------------------------------------------------------------------
* ADV 間隔設定 (0x12)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse12 = function(buf) {
	if(buf.length !== 0x06) {
		return null;
	}
	return {
		advInterval : buf.readUInt16LE(2) * 1.25, // Advertising interval (msec)
		advDuration : buf.readUInt16LE(4)         // Advertising 発行期間 (sec)
	};
};

AlpsChars.prototype._create12 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	let buf = Buffer.alloc(0x06);
	buf.writeUInt8(0x12, 0);
	buf.writeUInt8(0x06, 1);

	if('advInterval' in params) {
		let v = params['advInterval'];
		if(typeof(v) !== 'number' || v % 1 > 0 || v < 30 || v > 10000) {
			return {error: new Error('The `advInterval` must be an integer in the range of 30 to 10000.')};
		}
		buf.writeUInt16LE(parseInt(v / 1.25, 10), 2);
	} else {
		return {error: new Error('The `advInterval` is required.')};
	}

	if('advDuration' in params) {
		let v = params['advDuration'];
		if(typeof(v) !== 'number' || v % 1 > 0 || v < 0 || v > 6500) {
			return {error: new Error('The `advDuration` must be an integer in the range of 0 to 6500.')};
		}
		buf.writeUInt16LE(v, 4);
	} else {
		return {error: new Error('The `advDuration` is required.')};
	}

	return {buffer: buf};
};

/* ------------------------------------------------------------------
* 間欠 ADV 設定 (0x13)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse13 = function(buf) {
	if(buf.length !== 0x08) {
		return null;
	}
	return {
		intermittentAdvInterval     : buf.readUInt16LE(2) * 1.25, // 間欠 Advertising interval (msec)
		intermittentAdvDuration     : buf.readUInt16LE(4),        // 間欠 Advertising 発行期間 (sec)
		intermittentAdvIdleDuration : buf.readUInt8(6),           // 間欠 Advertising 停止期間 (sec)
		intermittentAdvRepeat       : buf.readUInt8(7)            // 間欠 Advertising 繰り返し回数
	};
};

AlpsChars.prototype._create13 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	let buf = Buffer.alloc(0x08);
	buf.writeUInt8(0x13, 0);
	buf.writeUInt8(0x08, 1);

	if('intermittentAdvInterval' in params) {
		let v = params['intermittentAdvInterval'];
		if(typeof(v) !== 'number' || v % 1 > 0 || v < 30 || v > 10000) {
			return {error: new Error('The `intermittentAdvInterval` must be an integer in the range of 30 to 10000.')};
		}
		buf.writeUInt16LE(parseInt(v / 1.25, 10), 2);
	} else {
		return {error: new Error('The `intermittentAdvInterval` is required.')};
	}

	if('intermittentAdvDuration' in params) {
		let v = params['intermittentAdvDuration'];
		if(typeof(v) !== 'number' || v % 1 > 0 || v < 0 || v > 6500) {
			return {error: new Error('The `intermittentAdvDuration` must be an integer in the range of 0 to 6500.')};
		}
		buf.writeUInt16LE(v, 4);
	} else {
		return {error: new Error('The `intermittentAdvDuration` is required.')};
	}

	if('intermittentAdvIdleDuration' in params) {
		let v = params['intermittentAdvIdleDuration'];
		if(typeof(v) !== 'number' || v % 1 > 0 || v < 0 || v > 255) {
			return {error: new Error('The `intermittentAdvIdleDuration` must be an integer in the range of 0 to 255.')};
		}
		buf.writeUInt8(v, 6);
	} else {
		return {error: new Error('The `intermittentAdvIdleDuration` is required.')};
	}

	if('intermittentAdvRepeat' in params) {
		let v = params['intermittentAdvRepeat'];
		if(typeof(v) !== 'number' || v % 1 > 0 || v < 0 || v > 255) {
			return {error: new Error('The `intermittentAdvRepeat` must be an integer in the range of 0 to 255.')};
		}
		buf.writeUInt8(v, 7);
	} else {
		return {error: new Error('The `intermittentAdvRepeat` is required.')};
	}

	return {buffer: buf};
};

/* ------------------------------------------------------------------
* タイマスリープ復帰 (0x14)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse14 = function(buf) {
	if(buf.length !== 0x04) {
		return null;
	}
	return {
		onTimer : buf.readUInt16LE(2) // 復帰時間設定 (sec)
	};
};

AlpsChars.prototype._create14 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}
	let onTimer = params['onTimer'];
	if(typeof(onTimer) !== 'number' || onTimer % 1 > 0 || onTimer < 0 || onTimer > 65535) {
		return {error: new Error('The `onTimer` must be an integer in the range of 0 to 65535.')};
	}

	let buf = Buffer.alloc(4);
	buf.writeUInt8(0x14, 0);
	buf.writeUInt8(0x04, 1);
	buf.writeUInt16LE(onTimer, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* デバイス名称 (0x15)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse15 = function(buf) {
	return {
		deviceName : buf.slice(2, buf.length).toString('ascii')
	};
};

AlpsChars.prototype._create15 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	let name = params['deviceName'];
	if(typeof(name) !== 'string' || name.length < 2 || name.length > 18 || name.match(/[^\x21-\x7e]/)) {
		return {error: new Error('The `deviceName` must be an ASCII string. The number of the characters must be between 2 and 18.')};
	}

	let name_buf = Buffer.from(name, 'ascii');
	let len = name_buf.length + 2;
	let head_buf = Buffer.alloc(2);
	head_buf.writeUInt8(0x15, 0);
	head_buf.writeUInt8(len, 1);
	let buf = Buffer.concat([head_buf, name_buf]);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* Beacon 動作 (0x16)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse16 = function(buf) {
	if(buf.length !== 0x07) {
		return null;
	}
	let n1 = buf.readUInt8(2);
	return {
		beaconFormat : (n1 & 0b10000000) ? 1 : 0, // 0: 環境系フォーマット, 1: モーション系フォーマット
		beaconMode   : (n1 & 0b00000011),         // 0: 無効, 1: Sensor Beacon, 2: General Beacon, 3: 無効
		beaconMajor  : buf.readUInt16LE(3),       // Beacon Major
		beaconMinor  : buf.readUInt16LE(5)        // Beacon Minor
	};
};

AlpsChars.prototype._create16 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	let format = params['beaconFormat'];
	if(typeof(format) !== 'number' || !format.toString().match(/^(0|1)$/)) {
		return {error: new Error('The `beaconFormat` must be 0 or 1.')};
	}

	let mode = params['beaconMode'];
	if(typeof(mode) !== 'number' || !mode.toString().match(/^(0|1|2|3)$/)) {
		return {error: new Error('The `beaconMode` must be 0, 1, or 2.')};
	}

	let major = params['beaconMajor'];
	if(typeof(major) !== 'number' || major % 1 > 0 || major < 0 || major > 0xFFFF) {
		return {error: new Error('The `beaconMajor` must be an integer in the range of 0 to ' + 0xFFFF + '.')};
	}

	let minor = params['beaconMinor'];
	if(typeof(minor) !== 'number' || minor % 1 > 0 || minor < 0 || minor > 0xFFFF) {
		return {error: new Error('The `beaconMinor` must be an integer in the range of 0 to ' + 0xFFFF + '.')};
	}

	let buf = Buffer.alloc(0x07);
	buf.writeUInt8(0x16, 0);
	buf.writeUInt8(0x07, 1);
	let n = 0;
	n = n | (format << 7);
	n = n | mode;
	buf.writeUInt8(n, 2);
	buf.writeUInt16LE(major, 3);
	buf.writeUInt16LE(minor, 5);

	return {buffer: buf};
};

/* ------------------------------------------------------------------
* General Beacon UUID設定 (0x17)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse17 = function(buf) {
	if(buf.length !== 0x12) {
		return null;
	}
	let uuid_raw = buf.slice(2, buf.length).toString('hex').toUpperCase();
	let uuid = [
		uuid_raw.substr(0, 8),
		uuid_raw.substr(8, 4),
		uuid_raw.substr(12, 4),
		uuid_raw.substr(16)
	].join('-');
	return {
		beaconUuid: uuid
	};
};

AlpsChars.prototype._create17 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	let uuid = params['beaconUuid'];
	if(!uuid) {
		return {error: new Error('The `beaconUuid` is required.')};
	}
	if(typeof(uuid) !== 'string') {
		return {error: new Error('The `beaconUuid` must be a string.')};
	}
	uuid = uuid.replace(/\-/g, '').toLowerCase();
	if(uuid.match(/[^a-f0-9]/) || uuid.length !== 32) {
		return {error: new Error('The `beaconUuid` is invalid.')};
	}

	let buf = Buffer.alloc(0x12);
	buf.writeUInt8(0x17, 0);
	buf.writeUInt8(0x12, 1);
	for(let i=0; i<16; i++) {
		buf.writeUInt8(parseInt(uuid.substr(i*2, 2), 16), i+2);
	}

	return {buffer: buf};
};

/* ------------------------------------------------------------------
* 計測制御 (0x20)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse20 = function(buf) {
	if(buf.length !== 0x03) {
		return null;
	}
	return {
		active: buf.readUInt8(2) ? true : false
	};
};

AlpsChars.prototype._create20 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	if(!('active' in params)) {
		return {error: new Error('The `active` is required.')};
	}
	let active = params['active'];
	if(typeof(active) !== 'boolean') {
		return {error: new Error('The `active` must be Boolean')};
	}
	active = active ? 1 : 0;

	let buf = Buffer.alloc(0x03);
	buf.writeUInt8(0x20, 0);
	buf.writeUInt8(0x03, 1);
	buf.writeUInt8(active, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* Bluetooth 通信動作設定 (0x21)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse21 = function(buf) {
	if(buf.length !== 0x03) {
		return null;
	}
	let d1 = buf.readUInt8(2);
	return {
		bleAutoSetting : (d1 & 0b10000000) ? false : true,
		bleAlwaysOn    : (d1 & 0b00000001) ? false : true
	};
};

AlpsChars.prototype._create21 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	if(!('bleAutoSetting' in params)) {
		return {error: new Error('The `bleAutoSetting` is required.')};
	}
	let auto = params['bleAutoSetting'];
	if(typeof(auto) !== 'boolean') {
		return {error: new Error('The `bleAutoSetting` must be Boolean')};
	}

	if(!('bleAlwaysOn' in params)) {
		return {error: new Error('The `bleAlwaysOn` is required.')};
	}
	let always = params['bleAlwaysOn'];
	if(typeof(always) !== 'boolean') {
		return {error: new Error('The `bleAlwaysOn` must be Boolean')};
	}

	let d = 0;
	if(auto) {
		d = d | 0b10000000;
	}
	if(always) {
		d = d | 0b00000001;
	}
	let buf = Buffer.alloc(0x03);
	buf.writeUInt8(0x21, 0);
	buf.writeUInt8(0x03, 1);
	buf.writeUInt8(d, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* スリープ設定 (0x22)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse22 = function(buf) {
	if(buf.length !== 0x03) {
		return null;
	}
	return {
		sleepMode : (buf.readUInt8(2) & 0b00000011) // 2: Accel Wake, 3: Timer Sleep
	};
};

AlpsChars.prototype._create22 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	if(!('sleepMode' in params)) {
		return {error: new Error('The `sleepMode` is required.')};
	}
	let mode = params['sleepMode'];
	if(typeof(mode) !== 'number' || !mode.toString().match(/^(2|3)$/)) {
		return {error: new Error('The `sleepMode` must be 2 or 3.')};
	}

	let buf = Buffer.alloc(0x03);
	buf.writeUInt8(0x22, 0);
	buf.writeUInt8(0x03, 1);
	buf.writeUInt8(mode, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* Data Up Disable (0x23)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse23 = function(buf) {
	if(buf.length !== 0x03) {
		return null;
	}
	return {
		sensorDataNotificationAllowed: buf.readUInt8(2) ? false : true
	};
};

AlpsChars.prototype._create23 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	if(!('sensorDataNotificationAllowed' in params)) {
		return {error: new Error('The `sensorDataNotificationAllowed` is required.')};
	}
	let allowed = params['sensorDataNotificationAllowed'];
	if(typeof(allowed) !== 'boolean') {
		return {error: new Error('The `sensorDataNotificationAllowed` must be Boolean')};
	}
	allowed = allowed ? 0 : 1;

	let buf = Buffer.alloc(0x03);
	buf.writeUInt8(0x23, 0);
	buf.writeUInt8(0x03, 1);
	buf.writeUInt8(allowed, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* 自動 Status 発行機能 (0x24)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse24 = function(buf) {
	if(buf.length !== 0x03) {
		return null;
	}
	return {
		autoStatusNotificationEnabled: buf.readUInt8(2) ? true : false
	};
};

AlpsChars.prototype._create24 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	if(!('autoStatusNotificationEnabled' in params)) {
		return {error: new Error('The `autoStatusNotificationEnabled` is required.')};
	}
	let enabled = params['autoStatusNotificationEnabled'];
	if(typeof(enabled) !== 'boolean') {
		return {error: new Error('The `autoStatusNotificationEnabled` must be Boolean')};
	}
	enabled = enabled ? 1 : 0;

	let buf = Buffer.alloc(0x03);
	buf.writeUInt8(0x23, 0);
	buf.writeUInt8(0x03, 1);
	buf.writeUInt8(enabled, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* エラー解除 (0x29)
* ---------------------------------------------------------------- */
AlpsChars.prototype._create29 = function() {
	let buf = Buffer.alloc(0x03);
	buf.writeUInt8(0x29, 0);
	buf.writeUInt8(0x03, 1);
	buf.writeUInt8(0x01, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* 接続パラメータ更新状況 通知リクエスト (0x2D)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse2D = function(buf) {
	if(buf.length !== 0x03) {
		return null;
	}
	return {
		progressNotificationEnabled: buf.readUInt8(2) ? true : false
	};
};

AlpsChars.prototype._create2D = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	if(!('progressNotificationEnabled' in params)) {
		return {error: new Error('The `progressNotificationEnabled` is required.')};
	}
	let enabled = params['progressNotificationEnabled'];
	if(typeof(enabled) !== 'boolean') {
		return {error: new Error('The `progressNotificationEnabled` must be Boolean')};
	}
	enabled = enabled ? 1 : 0;

	let buf = Buffer.alloc(0x03);
	buf.writeUInt8(0x2D, 0);
	buf.writeUInt8(0x03, 1);
	buf.writeUInt8(enabled, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* ステータス・リクエスト (0x2E)
* ---------------------------------------------------------------- */
AlpsChars.prototype._create2E = function() {
	let buf = Buffer.alloc(0x03);
	buf.writeUInt8(0x2E, 0);
	buf.writeUInt8(0x03, 1);
	buf.writeUInt8(0x01, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* 設定内容の保存／初期化 (0x2F)
* ---------------------------------------------------------------- */
AlpsChars.prototype._create2F = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	if(!('save' in params)) {
		return {error: new Error('The `save` is required.')};
	}
	let save = params['save'];
	if(typeof(save) !== 'boolean') {
		return {error: new Error('The `save` must be Boolean')};
	}

	if(!('initialize' in params)) {
		return {error: new Error('The `initialize` is required.')};
	}
	let initialize = params['initialize'];
	if(typeof(initialize) !== 'boolean') {
		return {error: new Error('The `initialize` must be Boolean')};
	}

	let d = 0;
	if(save) {
		d = d | 0b00000001;
	}
	if(initialize) {
		d = d | 0b00000011;
	}

	let buf = Buffer.alloc(0x03);
	buf.writeUInt8(0x2F, 0);
	buf.writeUInt8(0x03, 1);
	buf.writeUInt8(d, 2);
	return {buffer: buf};
};

/* ------------------------------------------------------------------
* 時刻設定 (0x30)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse30 = function(buf) {
	if(buf.length !== 0x0A) {
		return null;
	}
	return {
		millisecond : buf.readUInt16LE(2),
		second      : buf.readUInt8(4),
		minute      : buf.readUInt8(5),
		hour        : buf.readUInt8(6),
		day         : buf.readUInt8(7),
		month       : buf.readUInt8(8),
		year        : buf.readUInt8(9) + 2000
	};
};

AlpsChars.prototype._create30 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	if(!('millisecond' in params)) {
		return {error: new Error('The `millisecond` is required.')};
	}
	let millisecond = params['millisecond'];
	if(typeof(millisecond) !== 'number' || millisecond % 1 > 0 || millisecond < 0 || millisecond > 999) {
		return {error: new Error('The `millisecond` must be an integer in the range of 0 to 999.')};
	}

	if(!('second' in params)) {
		return {error: new Error('The `second` is required.')};
	}
	let second = params['second'];
	if(typeof(second) !== 'number' || second % 1 > 0 || second < 0 || second > 59) {
		return {error: new Error('The `second` must be an integer in the range of 0 to 59.')};
	}

	if(!('minute' in params)) {
		return {error: new Error('The `minute` is required.')};
	}
	let minute = params['minute'];
	if(typeof(minute) !== 'number' || minute % 1 > 0 || minute < 0 || minute > 59) {
		return {error: new Error('The `minute` must be an integer in the range of 0 to 59.')};
	}

	if(!('hour' in params)) {
		return {error: new Error('The `hour` is required.')};
	}
	let hour = params['hour'];
	if(typeof(hour) !== 'number' || hour % 1 > 0 || hour < 0 || hour > 59) {
		return {error: new Error('The `hour` must be an integer in the range of 0 to 59.')};
	}

	if(!('day' in params)) {
		return {error: new Error('The `day` is required.')};
	}
	let day = params['day'];
	if(typeof(day) !== 'number' || day % 1 > 0 || day < 1 || day > 31) {
		return {error: new Error('The `day` must be an integer in the range of 1 to 31.')};
	}

	if(!('month' in params)) {
		return {error: new Error('The `month` is required.')};
	}
	let month = params['month'];
	if(typeof(month) !== 'number' || month % 1 > 0 || month < 1 || month > 12) {
		return {error: new Error('The `month` must be an integer in the range of 1 to 12.')};
	}

	if(!('year' in params)) {
		return {error: new Error('The `year` is required.')};
	}
	let year = params['year'];
	if(typeof(year) !== 'number' || year % 1 > 0 || year < 2000 || year > 2099) {
		return {error: new Error('The `year` must be an integer in the range of 2000 to 2099.')};
	}

	let buf = Buffer.alloc(0x0A);
	buf.writeUInt8(0x30, 0);
	buf.writeUInt8(0x0A, 1);
	buf.writeUInt16LE(millisecond, 2);
	buf.writeUInt8(second, 4);
	buf.writeUInt8(minute, 5);
	buf.writeUInt8(hour, 6);
	buf.writeUInt8(day, 7);
	buf.writeUInt8(month, 8);
	buf.writeUInt8(year - 2000, 9);

	return {buffer: buf};
};

/* ------------------------------------------------------------------
* HW 異常検知 (0x31)
* ---------------------------------------------------------------- */
AlpsChars.prototype._parse31 = function(buf) {
	if(buf.length !== 0x03) {
		return null;
	}
	let n1 = buf.readUInt8(2);
	return {
		errorDetection             : (n1 & 0b10000000) ? true : false,
		errorDetectionPressure     : (n1 & 0b00010000) ? true : false,
		errorDetectionUv           : (n1 & 0b00001000) ? true : false,
		errorDetectionHumidity     : (n1 & 0b00000100) ? true : false,
		errorDetectionMagnetic     : (n1 & 0b00000010) ? true : false,
		errorDetectionAcceleration : (n1 & 0b00000001) ? true : false,
	};
};

AlpsChars.prototype._create31 = function(params) {
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Parameters are required.')};
	}

	let n = 0;
	let error = null;
	[
		'errorDetectionAcceleration',
		'errorDetectionMagnetic',
		'errorDetectionHumidity',
		'errorDetectionUv',
		'errorDetectionPressure',
		'',
		'',
		'errorDetection'
	].forEach((k, i) => {
		if(k) {
			if(!(k in params)) {
				error = new Error('The `' + k + '` is required.');
			} else if(typeof(params[k]) !== 'boolean') {
				error = new Error('The `' + k + '` must be Boolean.');
			} else {
				if(params[k] === true) {
					n = n | (1 << i);
				}
			}
		}
	});
	if(error) {
		return {error: error};
	}

	let buf = Buffer.alloc(0x03);
	buf.writeUInt8(0x31, 0);
	buf.writeUInt8(0x03, 1);
	buf.writeUInt8(n, 2);
	return {buffer: buf};
};

// 接続パラメータ更新状況通知 (0x81)
AlpsChars.prototype._parse81 = function(buf) {
	if(buf.length !== 0x03) {
		return null;
	}
	return {
		updateStatus: buf.readUInt8(2)
	};
};

// データパケット1 (0xF2)
AlpsChars.prototype._parseF2 = function(buf, range) {
	if(buf.length !== 20) {
		return null;
	}
	let div = 4096;
	if(range === 4) {
		div = 2048;
	} else if(range === 8) {
		div = 1024;
	} else if(range === 12) {
		div = 682.7;
	} else if(range === 16) {
		div = 512;
	}

	return {
		geoMagnetic: {
			x: buf.readInt16LE(2)  * 0.15, // uT
			y: buf.readInt16LE(4)  * 0.15, // uT
			z: buf.readInt16LE(6)  * 0.15  // uT
		},
		acceleration: {
			x: buf.readInt16LE(8)  / div,  // G
			y: buf.readInt16LE(10) / div,  // G
			z: buf.readInt16LE(12) / div   // G
		},
		timeStamp: {
			millisecond : buf.readUInt16LE(14),
			second      : buf.readUInt8(16),
			minute      : buf.readUInt8(17),
			hour        : buf.readUInt8(18)
		},
		dataIndex: buf.readUInt8(19)
	};
};

// データパケット2 (0xF3)
AlpsChars.prototype._parseF3 = function(buf) {
	if(buf.length !== 20) {
		return null;
	}
	return {
		pressure     : buf.readUInt16LE(2) * 860 / 65535 + 250, // hPa
		humidity     : (buf.readUInt16LE(4) - 896) / 64,        // %RH
		temperature  : (buf.readUInt16LE(6) - 2096) / 50,       // degC
		uv           : buf.readUInt16LE(8) / (100 * 0.388),     // mW/cm2
		ambient      : buf.readUInt16LE(10) / (0.05 * 0.928),   // Lx
		ambientLed   : buf.readUInt16LE(10) / (0.05 * 0.928 * 0.58), // Lx
		ambientFluorescent: buf.readUInt16LE(10) / (0.05 * 0.928 * 0.44), // Lx
		timeStamp    : {
			day   : buf.readUInt8(16),
			month : buf.readUInt8(17),
			year  : buf.readUInt8(18) + 2000
		},
		dataIndex    : buf.readUInt8(19)
	};
};

// ステータス通知 (0xE0)
AlpsChars.prototype._parseE0 = function(buf) {
	if(buf.length !== 20) {
		return null;
	}
	let n4 = buf.readUInt8(3);
	let error = {
		pressure     : (n4 & 0b00010000) ? true : false,
		uv           : (n4 & 0b00001000) ? true : false,
		humidity     : (n4 & 0b00000100) ? true : false,
		magnetic     : (n4 & 0b00000010) ? true : false,
		acceleration : (n4 & 0b00000001) ? true : false
	};
	return {
		error: error,
		rssi: buf.readInt8(6), // dBm
		battery: buf.readUInt16LE(7), // mV
		memFull: buf.readUInt8(9) ? true : false,
		ack: buf.readUInt8(10) // 1: Accepted, 2: Denied, 0: Others
	};
};

module.exports = new AlpsChars();
