"use strict";

const core = require('@lumjs/core');
const {S,N,F,def,isObj} = core.types;

const webcore = require('@lumjs/web-core');

const {parseHTML} = webcore.parser;
const {onEvent}   = webcore.events;
const {trigger}   = webcore.eventbuilder;

const {VALID_TAG,POS,addContent,addHTML,addText} = webcore.content;

const U = webcore.utils;
const Q = webcore.query;

const WRAPPER_DATA = Symbol('LumWebCoreWrapperDataMap');
const WRAPPER_OPTS = Symbol('LumWebCoreWrapperOptions');

/**
 * A wrapper around HTML Elements providing helper methods.
 * 
 * @exports module:@lumjs/web-core-extra/wrapper
 */
class ElementsWrapper
{
  /**
   * Build a new wrapper instance.
   * 
   * @param {(string|object)} wraps The element(s) we are wrapping.
   * 
   * If this is a `string` then it must be either a valid tag name,
   * or a snippet of HTML source.
   * 
   * If it is an `object`, it must be an `Element`, `NodeList`, 
   * `HTMLCollection`, or `Array` of `Element` objects.
   * 
   * @param {object} [options] Options that change the behaviours.
   * 
   * Will be assigned to the `options` instance property.
   * 
   * @param {object} [options.parse] Options for `parseHTML` function.
   * 
   * @param {function} [options.nodeClass=Element] Class for valid nodes.
   * 
   * @param {boolean} [options.separateSingle=true] 
   * If `true` and the `wraps` is a collection with only 1 element,
   * it is treated the same as if the element had been passed directly.
   * 
   * @param {boolean} [options.expandChildren=false]
   * See `children`, `firstChild`, and `lastChild` for a description of
   * what this option does.
   * 
   * @param {boolean} [options.wrapQueries=true]
   * Default value for the option of the same name in the
   * `get()`, `find()`, and `query()` methods.
   * 
   * @param {boolean} [options.queryDetails=false] 
   * Determines if the `query()` method gets advanced details
   * from the `@lumjs/web-core/query.find()` method or not.
   * 
   * @param {boolean} [options.recompileOptions=false]
   * The default value for the `recompile` argument of `getOptions()`.
   * 
   */
  constructor(wraps, options={})
  {
    const ct = options.nodeClass      ?? Element;
    const ss = options.separateSingle ?? true;

    // this._wrapped is the original wraps arg before processing.
    def(this, '_wrapped', {value: wraps});

    if (typeof wraps === S)
    {
      if (VALID_TAG.test(wraps))
      { // A simple element tag name.
        wraps = document.createElement(wraps);
      }
      else
      { // Assume an HTML snippet.
        const parseOpts = options.parse ?? options;
        wraps = parseHTML(wraps, parseOpts);
      }
    }

    // Are we wrapping a collection?
    let isCollection = U.isCollection(wraps, ct);

    if (ss && isCollection && wraps.length === 1)
    { // Separate the single element.
      wraps = wraps[0];
      isCollection = false;
    }

    const isValid = 
    (
      (isCollection && wraps.length > 0) // A non-empty collection.
      || wraps instanceof ct             // A single node.
    );

    def(this, 'options',      {value: options});
    def(this, 'wraps',        {value: wraps});
    def(this, 'isCollection', isCollection);
    def(this, 'isValid',      isValid);

  } // constructor()

  get id() 
  { 
    if (!this.isCollection)
    {
      return this.wraps.id;
    }
  }

  set id(id)
  {
    if (this.isCollection)
    {
      throw new TypeError("Cannot set 'id' on a collection!");
    }
    this.wraps.id = id;
  }

  get class()
  {
    if (!this.isValid) return null;

    if (this.isCollection)
    { 
      const lists = [];
      for (const node of this.wraps)
      {
        if (node.classList)
        {
          lists.push(node.classList);
        }
      }
      return lists;
    }
    else
    { 
      return this.wraps.classList;
    }
  }

  set class(className)
  {
    if (typeof className !== S)
    {
      throw new TypeError("Cannot set non-string class name");
    }

    if (!this.isValid) return null;

    if (this.isCollection)
    {
      for (const node of this.wraps)
      {
        node.className = className;
      }
    }
    else
    {
      this.wraps.className = className;
    }
  }

  /**
   * The first child `Element` of our wrapped element(s).
   * 
   * In the case where this instance has multiple wrapped elements,
   * what is returned depends on the `expandChildren` constructor option:
   * 
   * If `true` returns the first child element of the first wrapped element.
   * If `false` (default) returns the first wrapped element itself.
   * 
   * @returns {?Element}
   */
  get firstElement()
  {
    if (!this.isValid) return null;

    if (this.isCollection)
    {
      const child = this.wraps[0];
      return this.options.expandChildren ? child.firstElementChild : child;
    }
    else
    {
      return this.wraps.firstElementChild;
    }
  }

  /**
   * The last child `Element` of our wrapped element(s).
   * 
   * In the case where this instance has multiple wrapped elements,
   * what is returned depends on the `expandChildren` constructor option:
   * 
   * If `true` returns the last child element of the last wrapped element.
   * If `false` (default) returns the last wrapped element itself.
   * 
   * @returns {?Element}
   */
  get lastElement()
  {
    if (!this.isValid) return null;

    if (this.isCollection)
    {
      const child = this.wraps[this.wraps.length - 1];
      return this.options.expandChildren ? child.lastElementChild : child;
    }
    else
    {
      return this.wraps.lastElementChild
    }
  }

  /**
   * A wrapper of the first child element.
   * 
   * See `firstElement` for more details.
   * 
   * @returns {ElementsWrapper}
   */
  get first() { return this._make(this.firstElement); }

  /**
   * A wrapper of the last child element.
   * 
   * See `lastElement` for more details.
   * 
   * @returns {ElementsWrapper}
   */
  get last()  { return this._make(this.lastElement);  }

  /**
   * Get the children of the wrapped elements.
   * 
   * In the case where this instance has multiple wrapped elements,
   * what is returned depends on the `expandChildren` constructor option:
   * 
   * If `false` (default) returns this instance itself.
   * 
   * If `true`, then builds a new wrapper instance with a flat array
   * of the children from every wrapped element.
   * 
   * In the case of a single wrapped element, we simply return a
   * new wrapper instance using its children.
   * 
   * The new wrapper returned by this will have the same `expandChildren`
   * option as this instance, but `separateSingle` set to `false`.
   * 
   * @returns {ElementsWrapper}
   */
  get children()
  {
    if (!this.isValid) return this; // Not valid, returning ourself.

    let children;

    if (this.isCollection)
    {
      if (this.options.expandChildren)
      { // Expanded list of the children of our wrapped elements.
        children = [];
        for (const node of this.wraps)
        {
          for (const child of node.children)
          {
            children.push(child);
          }
        }
      }
      else
      { // Returns this wrapper as is.
        return this;
      }
    }
    else
    { 
      children = this.wraps.children;
    }

    const makeOpts =
    {
      expandChildren: this.options.expandChildren,
      separateSingle: false, // Force off.
    }

    return this._make(children, makeOpts);
  }

  /**
   * Get an array of wrapper instances for each child.
   * 
   * Uses the `children` getter property to generate the
   * list so all the notes about how `expandChildren` works
   * applies here as well.
   * 
   * @returns {ElementsWrapper[]}
   * 
   * May be an empty array if there were no valid children.
   * 
   */
  get wrappedChildren()
  {
    const wrapped = [];
    if (!this.isValid) return wrapped;

    // We make use of the `children` getter.
    const children = this.children;

    if (!children.isValid) return wrapped;
    if (!children.isCollection)
    {
      throw new Error(".children returned non-collection‽");
    }

    for (const node of children.wraps)
    {
      const wrappedNode = this._make(node);
      wrapped.push(wrappedNode);
    }

   
    return wrapped;
  }

  /**
   * Get a set of options.
   * 
   * Compiles a **new** options object composing the instance defaults
   * and any locally defined options.
   * 
   * This is used by `get()`, `find()`, and `query()`.
   * 
   * @param {object} [localOpts] Options to override instance defaults.
   * @param {boolean} [recompile] Force re-compilation?
   * 
   * This only has any effect if the `options` passed was returned
   * by the `getOptions()` method already.
   * 
   * - If `true`, it forces a new set of options to be compiled and returned.
   * - If `false`, it will return the `options` if they are already compiled.
   * 
   * If not specified, it uses `this.options.recompileOptions` as default.
   * 
   * @param {boolean} [mark=true] Add a `Symbol` to compiled options?
   * 
   * The `Symbol` property will be used to determine if an `object` is
   * already a compiled set of options generateds by this method.
   * 
   * This argument is meant for internal use only. Unless you know what you
   * are doing, leave it alone.
   * 
   * @returns {object} Compiled options.
   * 
   */
  getOptions(localOpts, recompile=this.options.recompileOptions, mark=true)
  {
    if (isObj(localOpts) && localOpts[WRAPPER_OPTS] && !recompile)
    { // Options already composed.
      return localOpts;
    }

    const compiledOpts = Object.assign({}, this.options, localOpts);
    if (mark) compiledOpts[WRAPPER_OPTS] = true;

    return compiledOpts;
  }

  /**
   * Get a single element.
   * 
   * @param {(string|number|function)} query - What we are looking for.
   * 
   * - If this is a `string` we use `node.querySelector()` directly.
   * - If this is a `number` we return the child element with that offset.
   * - If this is a `function` we return `this.query(options, false, query)`.
   * 
   * @param {object} [options] Options
   * @param {boolean} [options.wrapQueries] Should results be wrapped?
   * 
   * - If `true` the result will be wrapped in a new Wrapper instance.
   * - If `false` the result will be the first matching `Element`,
   *   or `null` if no elements in any of our wrapped nodes matched.
   * 
   * @returns {?(Element|ElementsWrapper)} Result of query.
   * @throws {TypeError} If `query` was an invalid type.
   */
  get(query, options)
  {
    options = this.getOptions(options);

    const wrap = options.wrapQueries ?? true;

    let elem;

    if (!this.isValid)
    {
      elem = null;
    }
    else if (typeof query === N)
    {
      if (this.isCollection)
      { // Use the `children` getter for collections.
        const children = this.children;
        elem = children.wraps[query];
      }
      else
      { // Single elements are simpler.
        elem = this.wraps.children[query];
      }
    }
    else if (typeof query === S)
    { // A selector.
      if (this.isCollection)
      {
        for (const node of this.wraps)
        {
          if (node instanceof Element)
          {
            const subres = node.querySelector(query);
            if (subres)
            { // Found a valid result.
              elem = subres;
              break;
            }
          }
        }
      }
      else
      { // Again, look how much easier.
        elem = this.wraps.querySelector(query);
      }
    }
    else if (typeof query === F)
    { // Pass it off to `query()` forcing the `multiple` option to `false`.
      return this.query(options, false, query);
    }
    else
    { // Anything else is invalid.
      console.error({query, options});
      throw new TypeError("invalid get() query type");
    }

    return wrap ? this._make(elem) : elem;

  }

  /**
   * Find multiple elements.
   * 
   * @param {(string|function)} query A selectory query.
   * 
   * - If this is a `string` we use `node.querySelectorAll()` directly.
   * - If this is a `function` we return `this.query(options, true, query)`.
   * 
   * @param {object} [options] Options [TBD]
   * @returns {?(Element[]|ElementsWrapper)} Result of query.
   * @throws {TypeError} If `query` was an invalid type.
   */
  find(query, options={})
  {
    options = this.getOptions(options);

    if (typeof query === F)
    {
      return this.query(options, true, query);
    }
    else if (typeof query !== S)
    {
      throw new TypeError("invalid find() query type");
    }

    const wrap = options.wrapQueries ?? true;

    let results;

    if (!this.isValid)
    {
      results = null;
    }
    else if (this.isCollection)
    {
      results = [];
      for (const node of this.wraps)
      {
        if (node instanceof Element)
        {
          const subres = node.querySelectorAll(query);
          if (subres)
          {
            for (const subnode of subres)
            {
              results.push(subnode);
            }
          }
        }
      }
    }
    else
    {
      results = this.wraps.querySelectorAll(query);
    }

    return wrap ? this._make(results) : results;
  }

  query(...args)
  {
    let results, options, invalidOpts=false;

    if (args.length === 0)
    { // No arguments, use the default options.
      invalidOpts = true;
    }
    else if (isObj(args[0]) && args[0][WRAPPER_OPTS])
    { // Compiled set of options passed.
      options = args.shift();
    }

    if (!options)
    { // No options found yet.
      options = this.getOptions();
    }

    const wrap     = options.wrapQueries  ?? true;
    const withInfo = options.queryDetails ?? false;

    const find    = withInfo ? Q.findWith : Q.find;
    const details = withInfo ? []         : null;

    if (isObj(options.getNested))
    { // Options for getNested specified inside our own options.
      args.push(options.getNested);
    }

    if (invalidOpts || !this.isValid)
    { // Invalid will always return a null result.
      results = null; // Invalid result
    }
    else if (this.isCollection)
    { // Multiple nodes to check.
      results = [];
      for (const node of this.wraps)
      {
        if (node instanceof Element)
        {
          const retValue = find(node, ...args);
          let subres;

          if (withInfo)
          {
            details.push(retValue);
            subres = retValue.found;
          }
          else
          {
            subres = retValue;
          }

          if (subres)
          { 
            if (subres instanceof Element)
            { // A single result
              results.push(subres);
            }
            else if (U.isCollection(subres))
            { // A collection of results.
              for (const subnode of subres)
              {
                results.push(subnode);
              }
            }
          }
        }
      }
    }
    else
    { // A single element.
      results = find(this.wraps, ...args);
      if (withInfo)
      { // Unwrap results from FindResult object.
        details.push(results);
        results = results.found;
      }
    }

    const retVal = wrap ? this._make(results) : results;

    if (withInfo)
    {
      def(retVal, '$findWith',     {value: details});
      def(retVal, '$queryOptions', {value: options});
    }

    return retVal;

  } // query()

  /**
   * Add content to our element(s).
   * 
   * Uses `@lumjs/web-core/content.addContent`.
   * 
   * @param {(string|object)} content Content to add
   * 
   * - If this value is a `string`, OR the instance is wrapping a single
   *   `Element`, then this will be passed to `addContent()` directly.
   * 
   * - If this is an `Element`, AND the instance is wrapping a collection
   *   of elements, then this will be _cloned_ for each wrapped element.
   * 
   * - If this is a collection of elements, AND the instance is wrapping 
   *   a collection of elements, then a separate array containing _clones_
   *   of each element in this will be used for each wrapped element.
   * 
   * @param {string} [pos] Position to add at (see `addContent()`).
   * @returns {object} `this`
   */
  add(content, pos=POS.LAST)
  {
    if (!this.isValid) return this;

    if (content instanceof ElementsWrapper)
    {
      content = content.wraps;
    }

    if (this.isCollection)
    {
      let getContent;

      if (typeof content === S)
      { // The simplest of all.
        getContent = () => content;
      }
      else if (content instanceof Element)
      { // Also fairly simple.
        getContent = () => content.cloneNode(true);
      }
      else if (U.isCollection(content))
      { // A collection of elements.
        getContent = function()
        {
          const clones = [];
          for (const elem of content)
          {
            clones.push(elem.cloneNode(true));
          }
          return clones;
        }
      }
      else
      { // We don't handle that.
        console.error({content});
        throw new TypeError("Invalid content");
      }

      for (const node of this.wraps)
      {
        addContent(node, getContent(), pos);
      }
    }
    else
    { // No cloning or otherwise required.
      addContent(this.wraps, content, pos);
    }

    return this;
  }

  /**
   * Add a snippet of HTML to our element(s).
   * 
   * Uses `@lumjs/web-core/content.addHTML`.
   * 
   * @param {string} html HTML text to add.
   * @param {string} [pos] Position to add at.
   * @returns {object} `this`
   */
  addHTML(html, pos=POS.LAST)
  {
    if (!this.isValid) return this;

    if (this.isCollection)
    {
      for (const node of this.wraps)
      {
        addHTML(node, html, pos);
      }
    }
    else
    {
      addHTML(this.wraps, html, pos);
    }
  }

  /**
   * Add a text node to our element(s).
   * 
   * Uses `@lumjs/web-core/content.addText`.
   * 
   * @param {string} text The text to add.
   * @param {string} [pos] Position to add at.
   * @returns {object} `this`
   */
  addText(text, pos=POS.LAST)
  {
    if (!this.isValid) return this;

    if (this.isCollection)
    {
      for (const node of this.wraps)
      {
        addText(node, text, pos);
      }
    }
    else
    {
      addText(this.wraps, text, pos);
    }
  }

  /**
   * Assign event handlers.
   * 
   * Uses `@lumjs/web-core/events.onEvent`
   * 
   * @param  {...any} args - Arguments for `onEvent()` function.
   * 
   * The `target` is specified explicitly, and the `off` named
   * option is set to `true` by default.
   * 
   * @returns {(object|object[])}
   * 
   * If this instance wraps a single Element this will return the
   * output of the `onEvent()` method, which will be an event
   * registration object.
   * 
   * If this instance wraps multiple elements, this will return an
   * `Array` of event registration objects, one for each element.
   * 
   */
  on(...args)
  {
    const defo = {off: true};
    let output;

    if (this.isCollection)
    {
      output = [];

      for (const node of this.wraps)
      {
        const reg = onEvent(node, defo, ...args);
        output.push(reg);
      }
    }
    else
    {
      output = onEvent(this.wraps, defo, ...args);
    }

    return output;
  }

  /**
   * Trigger an event.
   * 
   * Uses `@lumjs/web-core/eventbuilder.trigger()`;
   * passes our wrapped content as the target.
   * 
   * @param {(string|Event)} event - Event to trigger
   * @param {object} [options] Options
   * 
   * @returns {Array} An array of trigger result objects.
   */
  trigger(event, options)
  {
    return trigger(this.wraps, event, options);
  }

  /**
   * Private data storage for the wrapped object.
   * 
   * Uses `@lumjs/web-core/utils.getSymbolMap()`;
   * passes `this.wraps` as the target object.
   * 
   * The data is stored in a private symbol property
   * on the object itself (not in the wrapper instance.)
   * 
   * @returns {Map}
   */
  get data()
  {
    return U.getSymbolMap(this.wraps, WRAPPER_DATA);
  }

  /**
   * A callback function for the `each()` method.
   * 
   * Will be called once for every wrapped element.
   * 
   * @typedef {function} EachCallback
   * @param {number} index - 0-based index of which wrapped element.
   * @param {Element} node - An individual wrapped element (not collection).
   * @param {ElementsWrapper} wrapper - This wrapper instance.
   * @this {Element} Same element as `node` argument.
   * @returns {*} Whatever value you want.
   */

  /**
   * Result info for an individual element from `each()` method.
   * 
   * @typedef {object} EachResult
   * @prop {EachCallback} fn - The callback function.
   * @prop {Element} node - The individual element.
   * @prop {number} index - 0-based index of which wrapped element.
   * @prop {*} return - The return value from the callback function.
   */

  /**
   * Run a callback function for every directly wrapped element.
   * 
   * @param {EachCallback} fn - A callback function.
   * @returns {EachResult[]} An array of result objects.
   * One for each wrapped element.
   * 
   * If this instance wraps only a single element rather than a
   * collection of elements, the returned array will always have
   * just one result object in it.
   * 
   * If this instance does not have a valid wrapped element,
   * the returned array will be completely empty.
   */
  each(fn)
  {
    if (typeof fn !== F)
    {
      throw new TypeError("Invalid function");
    }

    const results = [];

    if (!this.isValid) return results;

    if (this.isCollection)
    {
      for (let i=0; i < node.length; i++)
      {
        const info = {fn, node, index: i};
        info.return = fn.call(node, i, node, this);
        results[i] = info;
      }
    }
    else
    {
      const node = this.wraps;
      const info = {fn, node, index: 0};
      info.return = fn.call(node, 0, node, this);
      results[0] = info;
    }

    return results;
  }

  // Make an instance with the same options.
  _make(wrap, options)
  {
    options = this.getOptions(options, true, false);
    //console.debug("Wrapper._make()", {wrap, options});
    return new this.constructor(wrap, options);
  }

}

module.exports = ElementsWrapper;
