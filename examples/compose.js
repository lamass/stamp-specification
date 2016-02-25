import merge from 'lodash/merge';
const assign = Object.assign;
const isFunction = obj => typeof obj === 'function';
const isObject = obj => !!obj && (typeof obj === 'function' || typeof obj === 'object');
const isDescriptor = isObject;

function createStamp(descriptor = {}, composeFunction) {
  function Stamp(options, ...args) {
    let obj = Object.create(descriptor.methods || {});

    merge(obj, descriptor.deepProperties);
    assign(obj, descriptor.properties);
    Object.defineProperties(obj, descriptor.propertyDescriptors || {});

    if (!descriptor.initializers || descriptor.initializers.length === 0) return obj;

    return descriptor.initializers.reduce((resultingObj, initializer) => {
      const returnedValue = initializer.call(resultingObj, options,
        {instance: resultingObj, stamp: Stamp, args: [options].concat(args)});
      return returnedValue === undefined ? resultingObj : returnedValue;
    }, obj);
  }

  merge(Stamp, descriptor.staticDeepProperties);
  assign(Stamp, descriptor.staticProperties);
  Object.defineProperties(Stamp, descriptor.staticPropertyDescriptors || {});

  const composeImplementation = isFunction(Stamp.compose) ? Stamp.compose : composeFunction;
  Stamp.compose = function () {
    return composeImplementation.apply(this, arguments);
  };
  assign(Stamp.compose, descriptor);

  return Stamp;
}

function mergeComposable(dstDescriptor, src) {
  const srcDescriptor = (src && src.compose) || src;
  if (!isDescriptor(srcDescriptor)) return dstDescriptor;

  const combineProperty = (propName, action) => {
    if (!isObject(srcDescriptor[propName])) return;
    if (!isObject(dstDescriptor[propName])) dstDescriptor[propName] = {};
    action(dstDescriptor[propName], srcDescriptor[propName]);
  };

  combineProperty('methods', assign);
  combineProperty('properties', assign);
  combineProperty('deepProperties', merge);
  combineProperty('propertyDescriptors', assign);
  combineProperty('staticProperties', assign);
  combineProperty('staticDeepProperties', merge);
  combineProperty('staticPropertyDescriptors', assign);
  combineProperty('configuration', merge);
  dstDescriptor.initializers = [].concat(dstDescriptor.initializers, srcDescriptor.initializers).filter(isFunction);

  return dstDescriptor;
}

function compose(...composables) {
  return createStamp(composables.reduce(mergeComposable, mergeComposable({}, this)), compose);
}

export default compose;
