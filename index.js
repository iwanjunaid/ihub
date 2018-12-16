const EventEmitter = require('events');
const to = require('easy-await-to');
const each = require('async/each');
const until = require('async/until');

const registerComponent = (hub, name, ref, deps) => {
  return new Promise(resolve => {
    until(() => {
      const registered = deps.reduce((acc, dependency) => {
        return hub.isRegistered(dependency) ? ++acc : acc;
      }, 0);

      return registered === deps.length;
    }, (cb) => {
      setTimeout(() => { cb(); }, 10);
    }, () => {
      if (typeof ref.boot === 'function') {
        ref.boot(hub, () => {
          hub.components[name] = ref;
          hub.timestamps[name] = new Date().getTime();
          hub.emit('registered', name);

          return resolve();
        });
      }

      return resolve();
    });
  });
};

class IHub extends EventEmitter {
  constructor(apiPrefix) {
    super();

    this.components = {};
    this.timestamps = {};
    this.apiPrefix = apiPrefix || 'api';
  }

  register(components = []) {
    const self = this;

    return new Promise((resolve, reject) => {
      each(components, async (component) => {
        const [name, ref, deps] = component;
        const safeDeps = Array.isArray(deps) ? deps : [];

        if (!name) return Promise.reject(new Error(`Component name should be provided!`));

        if (!ref) return Promise.reject(new Error(`Component object should be provided!`));
        
        await to(registerComponent(self, name, ref, safeDeps));

        return;
      }, (err) => {
        self.emit('finish', err);

        if (err) return reject(err);

        return resolve();
      });
    });
  }

  unregister(name) {
    delete this.components[name];
    delete this.timestamps[name];
  }

  isRegistered(name) {
    return this.components[name] ? true : false;
  }

  timestamp(name) {
    return this.timestamps[name];
  }

  hasApi(componentName, apiName) {
    if (!this.isRegistered(componentName)) return false;

    const component = this.components[componentName];
    const fullApiName = `${this.apiPrefix}${apiName}`;
    const isFunction = typeof component[fullApiName] === 'function';

    if (!isFunction) return false;

    return true;
  }

  async api(componentName, apiName, args) {
    if (!this.hasApi(componentName, apiName))
      return Promise.reject(new Error('API not found!'));

    const component = this.components[componentName];
    const fullApiName = `${this.apiPrefix}${apiName}`;

    return component[fullApiName].call(component, args);
  }
}

module.exports = IHub;
