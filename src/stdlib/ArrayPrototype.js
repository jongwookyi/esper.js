"use strict";

const EasyObjectValue = require('../values/EasyObjectValue');
const ObjectValue = require('../values/ObjectValue');
const ArrayValue = require('../values/ArrayValue');
const PrimitiveValue = require('../values/PrimitiveValue');
const CompletionRecord = require('../CompletionRecord');
const Value = require('../Value');
const _g = require('../GenDash');

function *getLength(v) {
	let m = yield * v.member('length');
	return yield * m.toUIntNative();

}

var defaultSeperator = Value.fromNative(',');

function *shiftRight(arr, start, amt) {
	amt = amt || 1;
	let len = yield * getLength(arr);
	for ( let i = len - 1; i >= start; --i ) {
		let cur = yield * arr.member(i);
		arr.assign(i+amt, cur);
	}
	arr.assign(start, Value.undef);
}

function *shiftLeft(arr, start, amt) {
	let len = yield * getLength(arr);
	for ( let i = start; i < len; ++i ) {
		let cur = yield * arr.member(i);
		yield * arr.put(i-amt, cur);
	}
	for ( let i = len-amt; i < len; ++i ) {
		delete arr.properties[i];
	}
	yield * arr.put('length', Value.fromNative(len - amt));
}


class ArrayPrototype extends EasyObjectValue {

	static *concat$e(thiz, args, s) {
		let fx = Value.undef;
		let targ = Value.undef;
		if ( args.length > 0 ) fx = args[0];
		if ( args.length > 1 ) targ = args[1];

		var out = [];
		var toCopy = [thiz].concat(args);

		let idx = 0;
		for ( let arr of toCopy ) {
			if ( arr instanceof PrimitiveValue ) {
				out[idx++] = arr;
			} else if ( !arr.has("length") ) {
				out[idx++] = arr;
			} else {
				let l = yield * getLength(arr);
				for ( let i = 0; i < l; ++i ) {
					let tv = yield * arr.member(i, s.realm);
					out[idx++] = tv;
				}
			}
		}	

		return ArrayValue.make(out, s.realm);
	}

	static *filter$e(thiz, args, s) {
		let fx = Value.undef;
		let targ = Value.undef;
		if ( args.length > 0 ) fx = args[0];
		if ( args.length > 1 ) targ = args[1];

		let test = function *(v, i) {
			let res = yield * fx.call(targ, [v, Value.fromNative(i), thiz], s);
			return res.truthy;
		};

		var out = [];

		let l = yield * getLength(thiz);
		for ( let i = 0; i < l; ++i ) {
			let tv = yield * thiz.member(i);
			let tru = yield * test(tv, i);
			if ( tru ) out.push(tv);
		}

		return ArrayValue.make(out, s.realm);
	}

	static *every$e(thiz, args, s) {
		let fx = Value.undef;
		let targ = Value.undef;
		if ( args.length > 0 ) fx = args[0];
		if ( args.length > 1 ) targ = args[1];

		let test = function *(v, i) {
			let res = yield * fx.call(targ, [v, Value.fromNative(i), thiz], s);
			return res.truthy;
		};

		let l = yield * getLength(thiz);
		for ( let i = 0; i < l; ++i ) {
			let tv = yield * thiz.member(i);
			let tru = yield * test(tv, i);
			if ( !tru ) return Value.false;
		}

		return Value.true;
	}

	static *some$e(thiz, args, s) {
		let fx = Value.undef;
		let targ = Value.undef;
		if ( args.length > 0 ) fx = args[0];
		if ( args.length > 1 ) targ = args[1];

		let test = function *(v, i) {
			let res = yield * fx.call(targ, [v, Value.fromNative(i), thiz], s);
			return res.truthy;
		};

		let l = yield * getLength(thiz);
		for ( let i = 0; i < l; ++i ) {
			let tv = yield * thiz.member(i);
			let tru = yield * test(tv, i);
			if ( tru ) return Value.true;
		}

		return Value.false;
	}

	static *map$e(thiz, args, s) {
		let fx = Value.undef;
		let targ = Value.undef;
		if ( args.length > 0 ) fx = args[0];
		if ( !fx.isCallable ) return yield CompletionRecord.makeTypeError(s.realm, "Arg2 not calalble.");

		if ( args.length > 1 ) targ = args[1];

		let l = yield * getLength(thiz);
		let out = new Array(l);
		for ( let i = 0; i < l; ++i ) {
			let tv = yield * thiz.member(i);
			let v = yield yield * fx.call(targ, [tv, Value.fromNative(i), thiz], s);
			out[i] = v;
		}

		return ArrayValue.make(out, s.realm);
	}

	static *forEach$e(thiz, args, s) {
		let fx = Value.undef;
		let targ = Value.undef;
		if ( args.length > 0 ) fx = args[0];
		if ( args.length > 1 ) targ = args[1];

		let l = yield * getLength(thiz);
		for ( let i = 0; i < l; ++i ) {
			if ( !thiz.has(i) ) continue;
			let v = yield * thiz.member(i);
			let res = yield * fx.call(targ, [v, Value.fromNative(i), thiz], s);
		}

		return Value.undef;
	}

	static *indexOf$e(thiz, args) {
		//TODO: Call ToObject() on thisz;
		let l = yield * getLength(thiz);
		let match = args[0] || Value.undef;
		let start = args[1] || this.fromNative(0);
		let startn = (yield * start.toNumberValue()).native;
		
		if ( isNaN(startn) ) startn = 0;
		else if ( startn < 0 ) startn = 0;

		if ( l > startn ) {
			for ( let i = startn; i < l; ++i ) {
				let v = yield * thiz.member(i);
				if ( !v ) v = Value.undef;
				if ( (yield * v.tripleEquals(match)).truthy ) return this.fromNative(i);
				
			}
		}
		return this.fromNative(-1);
	}

	static *lastIndexOf$e(thiz, args) {
		//TODO: Call ToObject() on thisz;
		let l = yield * getLength(thiz);
		let match = args[0] || Value.undef;
		let startn = l-1;

		if ( args.length > 1 ) startn = yield * args[1].toIntNative();
		if ( isNaN(startn) ) startn = 0;
		if ( startn < 0 ) startn += l;
		if ( startn > l ) startn = l;
		if ( startn < 0 ) return this.fromNative(-1);

	
		//if ( isNaN(startn) ) startn = l - 1;

		for ( let i = startn; i >= 0; --i ) {
			if ( !thiz.has(i) ) continue;
			let v = yield * thiz.member(i);
			if ( !v ) v = Value.undef;
			if ( (yield * v.tripleEquals(match)).truthy ) return this.fromNative(i);
			
		}

		return this.fromNative(-1);
	}

	static *join$e(thiz, args) {
		//TODO: Call ToObject() on thisz;
		let l = yield * getLength(thiz);
		let seperator = args[0] || defaultSeperator;
		let sepstr = (yield * seperator.toStringValue()).native;
		let strings = new Array(l);
		for ( let i = 0; i < l; ++i ) {
			if ( !thiz.has(i) ) continue;
			let v = yield * thiz.member(i);
			if ( !v ) strings[i] = '';
			else {
				if ( v.jsTypeName == 'undefined' ) {
					continue;
				}
				let sv = (yield * v.toStringValue());
				if ( sv ) strings[i] = sv.native;
				else strings[i] = undefined; //TODO: THROW HERE?
			}
		}
		return this.fromNative(strings.join(sepstr));
	}

	static *push$e(thiz, args) {
		let l = yield * getLength(thiz);
		for ( let i = 0; i < args.length; ++i ) {
			thiz.assign(l+i, args[i]);
		}
		return this.fromNative(l+args.length);
	}

	static *pop$e(thiz, args) {
		let l = yield * getLength(thiz);
		if ( l < 1 ) return Value.undef;
		let val = yield * thiz.member(l-1);
		thiz.assign('length', Value.fromNative(l-1));
		return val;
	}

	static *reverse$e(thiz, args, s) {
		let l = yield * getLength(thiz);
		for ( let i = 0; i < Math.floor(l/2); ++i ) {
			let lv = yield * thiz.member(i);
			let rv = yield * thiz.member(l-i-1);
			yield * thiz.put(l-i-1, lv, s);
			yield * thiz.put(i, rv, s);
		}

		return thiz;
	}

	static *reduce$e(thiz, args, s) {
		let l = yield * getLength(thiz);
		let acc;
		let fx = args[0];

		if ( args.length < 1 || !fx.isCallable ) {
			return yield CompletionRecord.makeTypeError("First argument to reduce must be a function.");
		}

		if ( args.length > 1 ) {
			acc = args[1];
		}

		for ( let i = 0; i < l; ++i ) {
			if ( !thiz.has(i) ) continue;
			let lv = yield * thiz.member(i);
			if ( !acc ) {
				acc = lv;
				continue;
			}
			acc = yield * fx.call(thiz, [acc, lv], s);
		}
		if ( !acc ) return yield CompletionRecord.makeTypeError(this.realm, "Reduce an empty array with no initial value.");
		return acc;
	}

	//TODO: Factor some stuff out of reduce and reduce right into a common function.
	static *reduceRight$e(thiz, args, s) {
		let l = yield * getLength(thiz);
		let acc;
		let fx = args[0];

		if ( args.length < 1 || !fx.isCallable ) {
			return yield CompletionRecord.makeTypeError(this.realm, "First argument to reduceRight must be a function.");
		}

		if ( args.length > 1 ) {
			acc = args[1];
		}

		for ( let i = l-1; i >= 0; --i ) {
			if ( !thiz.has(i) ) continue;
			let lv = yield * thiz.member(i);
			if ( !acc ) {
				acc = lv;
				continue;
			}
			acc = yield * fx.call(thiz, [acc, lv], s);
		}

		if ( !acc ) return yield CompletionRecord.makeTypeError(this.realm, "Reduce an empty array with no initial value.");
		return acc;
	}

	static *shift$e(thiz, args) {
		let l = yield * getLength(thiz);
		if ( l < 1 ) return Value.undef;
		
		let val = yield * thiz.member(0);
		yield * shiftLeft(thiz, 1, 1);
		return val;
	}

	static *slice$e(thiz, args, s) {
		//TODO: Call ToObject() on thisz;
		let length = yield * getLength(thiz);
		let result = [];

		let start = 0;
		let end = length;


		if ( args.length > 0 ) start = ( yield * args[0].toIntNative() );
		if ( args.length > 1 ) end = ( yield * args[1].toIntNative() );

		if ( start < 0 ) start = length + start;
		if ( end < 0 ) end = length + end;

		if ( end > length ) end = length;
		if ( start < 0 ) start = 0;


		for ( let i = start; i < end; ++i ) {
			result.push(yield * thiz.member('' + i ));
		}


		return ArrayValue.make(result, s.realm);
	}

	static *splice$e(thiz, args, s) {
		//TODO: Call ToObject() on thisz;


		let result = [];

		
		let deleteCount;
		let len = yield * getLength(thiz);
		let start = len;

		if ( isNaN(len) ) return thiz;

		if ( args.length > 0 ) start = yield * args[0].toIntNative();

		if ( start > len ) start = len;
		else if ( start < 0 ) start = len - start;

		if ( args.length > 1 ) deleteCount = yield * args[1].toIntNative();
		else deleteCount = len - start;

		if ( deleteCount > (len - start) ) deleteCount = len - start;
		if ( deleteCount < 0 ) deleteCount = 0;

		let deleted = [];
		let toAdd = args.slice(2);
		let delta = toAdd.length - deleteCount;

		for ( let i = start; i < start + deleteCount; ++i ) {
			deleted.push(yield * thiz.member(i));
		}

		if ( delta > 0 ) yield * shiftRight(thiz, start, delta);
		if ( delta < 0 ) yield * shiftLeft(thiz, start - delta, -delta);

		for ( let i = 0; i < toAdd.length; ++i ) {
			yield * thiz.put(start + i, toAdd[i]);
		}

		yield * thiz.put('length', Value.fromNative(len + delta));

		
		return ArrayValue.make(deleted, s.realm);
	}

	static *sort$e(thiz,args, s) {
		let length = yield * getLength(thiz);
		let vals = new Array(length);
		for ( let i = 0; i < length; ++i ) {
			vals[i] = yield * thiz.member(i);
		}

		let comp = function *(left, right) {
			let l = yield * left.toStringValue();
			if ( !l ) return false;
			let r = yield * right.toStringValue();
			if ( !r ) return true;
			return (yield * l.lt(r)).truthy;
		};

		if ( args.length > 0 ) {
			let fx = args[0];
			if ( !fx.isCallable ) return yield CompletionRecord.makeTypeError(s.realm, "Arg2 not calalble.");
			comp = function *(left, right) {
				let res = yield * fx.call(Value.undef, [left, right], s);
				return ( yield * res.lt(Value.fromNative(0)) ).truthy;
			};
		}

		let nue = yield * _g.sort(vals, comp);
		
		for ( let i = 0; i < length; ++i ) {
			thiz.assign(i, nue[i]);
		}
		return thiz;
	}

	static *toString$e(thiz, args) {
		let joinfn = yield * thiz.member('join');
		if ( !joinfn || !joinfn.isCallable ) {
			let ots = yield * this.realm.ObjectPrototype.member('toString');
			return yield * ots.call(thiz, []);
		} else {
			return yield * joinfn.call(thiz, [defaultSeperator]);
		}
		
	}

	static *unshift$e(thiz, args, s) {
		let amt = args.length;
		let len = yield * getLength(thiz);
		if ( isNaN(len) ) len = 0;
		yield * shiftRight(thiz, 0, amt);
		for ( let i = 0; i < amt; ++i ) {
			thiz.assign(i, args[i]);
		}

		let nl = Value.fromNative(len + amt);
		yield * thiz.put('length', nl, s);
		return nl;
	}

}

ArrayPrototype.prototype.wellKnownName = '%ArrayPrototype%';

module.exports = ArrayPrototype;

