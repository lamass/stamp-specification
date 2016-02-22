import merge from 'lodash/merge';
const assign = Object.assign;
const isFunction = obj => typeof obj === 'function';
const isObject = obj => !!obj && (typeof obj === 'function' || typeof obj === 'object');
const isDescriptor = isObject;

const createStamp = (descriptor) => {
  const {
    methods, properties, deepProperties, propertyDescriptors, initializers,
    staticProperties, deepStaticProperties, staticPropertyDescriptors
    } = descriptor;

  const Stamp = function Stamp(options, ...args) {
    let obj = Object.create(methods || {});

    merge(obj, deepProperties);
    assign(obj, properties);

    if (propertyDescriptors) Object.defineProperties(obj, propertyDescriptors);

    if (Array.isArray(initializers)) {
      initializers.forEach(initializer => {
        const returnValue = initializer.call(obj, options,
          {instance: obj, stamp: Stamp, args: [options].concat(args)});
        if (returnValue !== undefined) {
          obj = returnValue;
        }
      });
    }

    return obj;
  };

  merge(Stamp, deepStaticProperties);
  assign(Stamp, staticProperties);
  if (staticPropertyDescriptors) Object.defineProperties(Stamp, staticPropertyDescriptors);

  if (!isFunction(Stamp.compose)) {
    Stamp.compose = function () {
      return compose.apply(this, arguments);
    };
  }
  assign(Stamp.compose, descriptor);

  return Stamp;
};

function mergeInComposable(dstDescriptor, src) {
  const srcDescriptor = (src && src.compose) || src;
  if (!isDescriptor(srcDescriptor)) return dstDescriptor;

  const combineDescriptorProperty = (propName, action) => {
    if (!isObject(srcDescriptor[propName])) return;
    if (!isObject(dstDescriptor[propName])) dstDescriptor[propName] = {};
    action(dstDescriptor[propName], srcDescriptor[propName]);
  };

  combineDescriptorProperty('methods', assign);
  combineDescriptorProperty('properties', assign);
  combineDescriptorProperty('deepProperties', merge);
  combineDescriptorProperty('staticProperties', assign);
  combineDescriptorProperty('deepStaticProperties', merge);
  combineDescriptorProperty('propertyDescriptors', assign);
  combineDescriptorProperty('staticPropertyDescriptors', assign);
  combineDescriptorProperty('configuration', merge);
  dstDescriptor.initializers = [].concat(dstDescriptor.initializers, srcDescriptor.initializers).filter(isFunction);

  return dstDescriptor;
}

function compose(...composables) {
  return createStamp(composables.reduce(mergeInComposable, mergeInComposable({}, this)));
}

export default compose;
