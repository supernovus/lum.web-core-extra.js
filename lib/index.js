/**
 * Extensions for the `@lumjs/web-core` libraries.
 * @module @lumjs/web-core-extra
 */

/**
 * An alias to `@lumjs/web-core/content.POS`
 * @name {module:@lumjs/web-core-extra.POS}
 * @type {object}
 */

const {POS} = require('@lumjs/web-core').content;

/**
 * A wrapper class around HTML elements providing a bunch of
 * convenience methods and accessor properties.
 * 
 * @alias module:@lumjs/web-core-extra.Wrapper
 * @see module:@lumjs/web-core-extra/wrapper
 */
const Wrapper = require('./wrapper');

/**
 * Build and return a new Wrapper instance.
 * @param {(string|object)} wraps The element(s) to be wrapped.
 * @param {object} [options] Options
 * @returns {module:@lumjs/web-core-extra/wrapper} 
 * @see module:@lumjs/web-core-extra/wrapper#constructor
 */
function wrap(wraps, options)
{
  return new Wrapper(wraps, options);
}

module.exports =
{
  Wrapper, wrap, POS,
}
